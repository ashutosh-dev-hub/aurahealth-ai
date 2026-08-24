# AuraHealth AI — System Design & Architecture Write-up

## 1. Executive Summary & Objective
AuraHealth AI is an enterprise-grade healthcare consultation and follow-up management platform engineered to resolve core clinical scheduling bottlenecks: race conditions during simultaneous slot booking, doctor leave schedule conflicts, patient symptom triage, and post-consultation medication adherence. The system connects Patients, Doctors, and Administrators via role-based access control (RBAC), backed by an asynchronous event/cron engine and resilient AI pipelines.

---

## 2. Concurrency Control & Double-Booking Prevention
Medical appointments require strict consistency guarantees. In standard architectures, read-then-write booking queries create critical race windows where two patients can simultaneously book the exact same doctor slot.

AuraHealth AI eliminates double-booking using a **Two-Tier Reservation Pipeline**:

```
[ Patient Selects Slot ] 
         │
         ▼
[ 1. Atomic Slot Hold (5-min TTL Lock) ] ──> Unique Constraint: (doctorId, slotTime)
         │
         ▼
[ 2. Complete Symptom Intake ]
         │
         ▼
[ 3. DB Transaction Commit ] ──> Check Conflict ──> Delete Hold ──> Insert Appointment
```

1. **Tier 1: Atomic Slot Hold (TTL Lock)**
   - When a patient clicks an available time slot, the client calls `POST /api/appointments/hold`.
   - The server creates/refreshes an atomic record in the `SlotHold` table with a composite unique constraint `@@unique([doctorId, slotTime])` and an expiration timestamp `expiresAt = now + 5 minutes`.
   - If another patient attempts to hold or book this slot before expiration, the database rejects the request with HTTP `409 Conflict` (`SLOT_HELD_BY_ANOTHER`).
   - A background garbage collection worker sweeps expired holds every 30 seconds (`DELETE FROM SlotHold WHERE expiresAt < now`).

2. **Tier 2: Serializable Database Transaction Commit**
   - When the patient submits their symptom intake, `POST /api/appointments/book` runs inside an isolated database transaction (`prisma.$transaction`).
   - The transaction asserts that no confirmed appointment exists for `(doctorId, dateTime)` and ensures the hold belongs exclusively to the requesting patient.
   - The hold is released, the appointment is created with `CONFIRMED` status, and the pre-visit triage dossier is linked atomically.

---

## 3. Doctor Leave Conflict & Patient Resolution Engine
When a physician marks sudden or scheduled absence (`POST /api/leaves`), existing patient consultations within that window become invalid. AuraHealth AI implements an **Automated Leave Conflict Resolution Pipeline**:

1. **Overlapping Detection & Status Transition**:
   - Within an atomic transaction, the system queries all active appointments (`status IN ['CONFIRMED', 'PENDING']`) where `dateTime` falls between `startDate` and `endDate`.
   - Conflicting appointments are transitioned to `RESCHEDULE_REQUIRED` and annotated with the doctor's leave reason.

2. **Patient Priority Notification Queue**:
   - For every affected appointment, a priority notification event is enqueued.
   - An email is dispatched with a dedicated one-click priority reschedule token/link (`/patient/book?doctorId=...&rescheduleAppointmentId=...`), allowing affected patients to select an alternative slot or specialist without re-entering symptoms.

---

## 4. AI Pipeline & Fault-Tolerant Fallback Strategy
AuraHealth AI integrates dual-stage clinical LLM analysis:
- **Pre-Visit Intake**: Extracts Chief Complaint, Urgency Level (`LOW`, `MEDIUM`, `HIGH`), and 3 diagnostic inquiry questions for the doctor.
- **Post-Visit Summary**: Transforms clinical shorthand and prescriptions into empathetic, patient-friendly care instructions.

**Fault Tolerance & Zero-Downtime Resilience**:
To prevent LLM API outages or rate limits from disrupting clinical operations, the AI Service implements a deterministic clinical heuristic fallback engine. If Gemini/OpenAI API requests timeout or fail, natural language keyword parsing (e.g., chest pain, respiratory distress, acute fever) deterministically assigns clinical urgency and standard diagnostic inquiry sets without returning HTTP 500 errors.

---

## 5. Background Workers & Notification Reliability
Medical adherence requires scheduled follow-up reliability. AuraHealth AI deploys a dedicated cron worker (`node-cron`):

1. **Medication Adherence Scheduler**:
   - Prescriptions are parsed by dosage frequency (`once_daily`, `twice_daily`, `thrice_daily`, `every_8_hours`).
   - Future dosage reminders are inserted into the `MedicationReminder` table.
   - Every minute, the worker queries due reminders (`scheduledTime <= now AND status = 'SCHEDULED'`), sends automated email alerts, and allows patients to check off taken doses on their tracker.

2. **Exponential Backoff Email Retry Worker**:
   - All email dispatches are logged to `NotificationLog`.
   - If an SMTP network error occurs, the record is flagged as `FAILED`.
   - The retry worker processes failed logs every 5 minutes (up to 4 retry attempts) before dead-letter logging, ensuring guaranteed delivery.

3. **Google Calendar & RFC 5545 iCalendar Sync**:
   - On booking, Google Calendar OAuth events are created. As a cross-platform fallback, a standard RFC 5545 `.ics` file is generated and attached to confirmation emails, enabling one-click import into Apple Calendar, Outlook, and mobile devices.
