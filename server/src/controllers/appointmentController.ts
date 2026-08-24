import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { generatePreVisitSummary } from '../services/aiService.js';
import { sendNotificationEmail, getBookingEmailTemplate } from '../services/emailService.js';
import { createGoogleCalendarEvent, generateIcsString, deleteGoogleCalendarEvent } from '../services/calendarService.js';
import { ENV } from '../config/env.js';

const holdSlotSchema = z.object({
  doctorId: z.string().uuid(),
  slotTime: z.string().datetime(),
});

const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  slotTime: z.string().datetime(),
  symptomsText: z.string().min(5, 'Please describe symptoms in at least 5 characters'),
  duration: z.string().optional(),
});

/**
 * Acquire a 5-minute temporary exclusive hold on a doctor's slot to prevent race conditions.
 */
export async function holdSlot(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const patientId = req.user?.id;
    if (!patientId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { doctorId, slotTime } = holdSlotSchema.parse(req.body);
    const slotDate = new Date(slotTime);
    const now = new Date();
    const holdDurationMinutes = 5;
    const expiresAt = new Date(now.getTime() + holdDurationMinutes * 60 * 1000);

    // 1. Validate Doctor exists
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
    });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    // 2. Validate doctor not on leave
    const onLeave = await prisma.doctorLeave.findFirst({
      where: {
        doctorId,
        status: 'APPROVED',
        startDate: { lte: slotDate },
        endDate: { gte: slotDate },
      },
    });
    if (onLeave) {
      res.status(400).json({ success: false, message: 'Doctor is on scheduled leave during this time.' });
      return;
    }

    // 3. Concurrency-safe atomic check & hold creation inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if already confirmed
      const existingAppointment = await tx.appointment.findFirst({
        where: {
          doctorId,
          dateTime: slotDate,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      });

      if (existingAppointment) {
        throw new Error('SLOT_ALREADY_BOOKED');
      }

      // Check existing slot hold
      const existingHold = await tx.slotHold.findUnique({
        where: {
          doctorId_slotTime: {
            doctorId,
            slotTime: slotDate,
          },
        },
      });

      if (existingHold && existingHold.expiresAt > now && existingHold.patientId !== patientId) {
        throw new Error('SLOT_HELD_BY_ANOTHER');
      }

      // Upsert hold
      const hold = await tx.slotHold.upsert({
        where: {
          doctorId_slotTime: {
            doctorId,
            slotTime: slotDate,
          },
        },
        update: {
          patientId,
          expiresAt,
        },
        create: {
          doctorId,
          slotTime: slotDate,
          patientId,
          expiresAt,
        },
      });

      return hold;
    });

    res.json({
      success: true,
      message: `Slot reserved exclusively for ${holdDurationMinutes} minutes. Complete your intake form to confirm.`,
      data: {
        slotHoldId: result.id,
        doctorId: result.doctorId,
        slotTime: result.slotTime,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error: any) {
    if (error.message === 'SLOT_ALREADY_BOOKED') {
      res.status(409).json({ success: false, message: 'This slot has already been booked by another patient.' });
      return;
    }
    if (error.message === 'SLOT_HELD_BY_ANOTHER') {
      res.status(409).json({
        success: false,
        message: 'This slot is currently temporarily reserved by another patient. Please check back in a few minutes.',
      });
      return;
    }
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message });
      return;
    }
    console.error('Error holding slot:', error);
    res.status(500).json({ success: false, message: 'Failed to reserve time slot' });
  }
}

/**
 * Confirm and book an appointment with AI Pre-visit Triage, calendar event, and email notifications.
 */
export async function bookAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const patientId = req.user?.id;
    if (!patientId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { doctorId, slotTime, symptomsText, duration } = bookAppointmentSchema.parse(req.body);
    const startDateTime = new Date(slotTime);
    const now = new Date();

    // 1. Fetch Doctor details & verify
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    // 2. Compute End Time
    const slotDurationMs = (doctor.slotDurationMinutes || 30) * 60 * 1000;
    const endDateTime = new Date(startDateTime.getTime() + slotDurationMs);

    // 3. Generate AI Pre-Visit Triage Summary
    const aiTriage = await generatePreVisitSummary(symptomsText, duration);

    // 4. Concurrency-safe booking transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // Check if already booked
      const existing = await tx.appointment.findFirst({
        where: {
          doctorId,
          dateTime: startDateTime,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      });

      if (existing) {
        throw new Error('DOUBLE_BOOKING_PREVENTED');
      }

      // Check slot hold conflict
      const activeHold = await tx.slotHold.findUnique({
        where: {
          doctorId_slotTime: {
            doctorId,
            slotTime: startDateTime,
          },
        },
      });

      if (activeHold && activeHold.expiresAt > now && activeHold.patientId !== patientId) {
        throw new Error('SLOT_HELD_BY_ANOTHER');
      }

      // Release any slot hold
      await tx.slotHold.deleteMany({
        where: {
          doctorId,
          slotTime: startDateTime,
        },
      });

      // Create appointment
      const newAppointment = await tx.appointment.create({
        data: {
          patientId,
          doctorId,
          dateTime: startDateTime,
          endTime: endDateTime,
          status: 'CONFIRMED',
          symptomIntake: {
            create: {
              symptomsText,
              duration: duration || null,
              urgencyLevel: aiTriage.urgencyLevel,
              chiefComplaint: aiTriage.chiefComplaint,
              suggestedQuestions: JSON.stringify(aiTriage.suggestedQuestions),
              rawLlmResponse: aiTriage.rawResponse || null,
            },
          },
        },
        include: {
          patient: true,
          doctor: { include: { user: true } },
          symptomIntake: true,
        },
      });

      return newAppointment;
    });

    // 5. Create Calendar Event and Meeting Link
    const calendarResult = await createGoogleCalendarEvent(
      {
        summary: `AuraHealth Consultation: ${appointment.patient.name} & Dr. ${doctor.user.name}`,
        description: `Chief Complaint: ${aiTriage.chiefComplaint}\nUrgency: ${aiTriage.urgencyLevel}\nSpecialization: ${doctor.specialization}`,
        startDateTime,
        endDateTime,
        attendeeEmails: [appointment.patient.email, doctor.user.email],
      },
      doctor.user.googleRefreshToken || undefined
    );

    // Update meeting link in DB if generated
    if (calendarResult.meetingLink || calendarResult.eventId) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          googleCalendarEventId: calendarResult.eventId,
          meetingLink: calendarResult.meetingLink,
        },
      });
    }

    // 6. Generate standard .ics Calendar Invite
    const icsContent = generateIcsString({
      uid: appointment.id,
      summary: `AuraHealth: Dr. ${doctor.user.name} & ${appointment.patient.name}`,
      description: `Appointment with Dr. ${doctor.user.name} (${doctor.specialization}).\nUrgency: ${aiTriage.urgencyLevel}\nChief Complaint: ${aiTriage.chiefComplaint}`,
      startTime: startDateTime,
      endTime: endDateTime,
      location: calendarResult.meetingLink || 'AuraHealth Virtual Clinic',
      organizerName: `Dr. ${doctor.user.name}`,
      organizerEmail: doctor.user.email,
    });

    // 7. Send asynchronous confirmation emails to Patient and Doctor
    const formattedDate = startDateTime.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Patient email
    sendNotificationEmail({
      to: appointment.patient.email,
      subject: `Confirmed: Consultation with Dr. ${doctor.user.name} on ${formattedDate}`,
      html: getBookingEmailTemplate({
        patientName: appointment.patient.name,
        doctorName: doctor.user.name,
        specialization: doctor.specialization,
        dateTime: formattedDate,
        urgencyLevel: aiTriage.urgencyLevel,
        meetingLink: calendarResult.meetingLink,
        portalUrl: `${ENV.CLIENT_URL}/patient/appointments`,
      }),
      type: 'BOOKING_CONFIRMATION',
      icsContent,
      icsFilename: `AuraHealth_Dr_${doctor.user.name.replace(/\s+/g, '_')}.ics`,
    }).catch(err => console.error('Patient email dispatch failed:', err));

    // Doctor notification email
    sendNotificationEmail({
      to: doctor.user.email,
      subject: `New Patient Booked: ${appointment.patient.name} [Urgency: ${aiTriage.urgencyLevel}]`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0284c7;">New Consultation Booked</h2>
          <p><strong>Patient:</strong> ${appointment.patient.name} (${appointment.patient.email})</p>
          <p><strong>Date & Time:</strong> ${formattedDate}</p>
          <p><strong>AI Triage Urgency:</strong> <span style="font-weight: bold; color: ${aiTriage.urgencyLevel === 'HIGH' ? '#dc2626' : '#0284c7'}">${aiTriage.urgencyLevel}</span></p>
          <p><strong>Chief Complaint:</strong> ${aiTriage.chiefComplaint}</p>
          <p><strong>Suggested Diagnostic Questions:</strong></p>
          <ul>
            ${aiTriage.suggestedQuestions.map(q => `<li>${q}</li>`).join('')}
          </ul>
          <p><a href="${ENV.CLIENT_URL}/doctor/consultations" style="color: #0284c7; font-weight: bold;">Open Doctor Clinical Dossier</a></p>
        </div>
      `,
      type: 'BOOKING_CONFIRMATION',
      icsContent,
      icsFilename: `AuraHealth_Patient_${appointment.patient.name.replace(/\s+/g, '_')}.ics`,
    }).catch(err => console.error('Doctor email dispatch failed:', err));

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      data: {
        ...appointment,
        meetingLink: calendarResult.meetingLink,
      },
    });
  } catch (error: any) {
    if (error.message === 'DOUBLE_BOOKING_PREVENTED' || error.message === 'SLOT_HELD_BY_ANOTHER') {
      res.status(409).json({
        success: false,
        message: 'This slot was just claimed by another user. Please choose another slot.',
      });
      return;
    }
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message });
      return;
    }
    console.error('Booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to book appointment' });
  }
}

/**
 * List appointments filtered by role.
 */
export async function getAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { status, doctorId, patientId } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (user.role === 'PATIENT') {
      where.patientId = user.id;
    } else if (user.role === 'DOCTOR') {
      where.doctorId = user.doctorId;
    } else if (user.role === 'ADMIN') {
      if (doctorId && typeof doctorId === 'string') where.doctorId = doctorId;
      if (patientId && typeof patientId === 'string') where.patientId = patientId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
        },
        doctor: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        symptomIntake: true,
        clinicalRecord: true,
      },
      orderBy: { dateTime: 'desc' },
    });

    res.json({ success: true, data: appointments });
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
  }
}

/**
 * Fetch a single appointment with full dossier.
 */
export async function getAppointmentById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
        },
        doctor: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        symptomIntake: true,
        clinicalRecord: true,
        medicationReminders: true,
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    // Role check
    if (user?.role === 'PATIENT' && appointment.patientId !== user.id) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    if (user?.role === 'DOCTOR' && appointment.doctorId !== user.doctorId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointment details' });
  }
}

/**
 * Cancel an appointment with calendar synchronization and email notifications.
 */
export async function cancelAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    if (user?.role === 'PATIENT' && appointment.patientId !== user.id) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    if (user?.role === 'DOCTOR' && appointment.doctorId !== user.doctorId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason || `Cancelled by ${user?.name || 'user'}`,
      },
    });

    // Delete calendar event if exists
    if (appointment.googleCalendarEventId) {
      deleteGoogleCalendarEvent(appointment.googleCalendarEventId, appointment.doctor.user.googleRefreshToken || undefined)
        .catch(err => console.warn('Google calendar event deletion failed:', err));
    }

    // Send cancellation notifications
    const notifyTarget = user?.role === 'PATIENT' ? appointment.doctor.user.email : appointment.patient.email;
    sendNotificationEmail({
      to: notifyTarget,
      subject: `Appointment Cancelled: ${appointment.dateTime.toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 8px;">
          <h2 style="color: #dc2626;">Appointment Cancelled</h2>
          <p>The scheduled consultation on <strong>${appointment.dateTime.toLocaleString()}</strong> has been cancelled.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p><a href="${ENV.CLIENT_URL}" style="color: #0284c7; font-weight: bold;">Return to AuraHealth</a></p>
        </div>
      `,
      type: 'CANCELLATION',
    }).catch(err => console.error('Cancellation email failed:', err));

    res.json({ success: true, message: 'Appointment cancelled successfully', data: updated });
  } catch (error: any) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel appointment' });
  }
}
