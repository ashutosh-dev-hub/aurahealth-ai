import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { DoctorProfile, Slot } from '../../types';
import { api, ApiError } from '../../services/api';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import {
  Calendar as CalendarIcon,
  Clock,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Video,
  Download,
  AlertCircle,
} from 'lucide-react';

const COMMON_SYMPTOM_TAGS = [
  'Chest Tightness & Palpitations',
  'Severe Migraine with Visual Aura',
  'Persistent Dry Cough & Fever',
  'Skin Rash & Itching',
  'Acute Abdominal Discomfort',
  'Joint Pain & Morning Stiffness',
  'Dizziness & Fatigue',
];

export const BookingFlowPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const doctorIdParam = searchParams.get('doctorId');
  const rescheduleApptId = searchParams.get('rescheduleAppointmentId');

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);

  // Date selection (default today in YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');

  // Held slot state
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [holdTimeLeftSeconds, setHoldTimeLeftSeconds] = useState<number | null>(null);

  // Symptom form
  const [symptomsText, setSymptomsText] = useState('');
  const [duration, setDuration] = useState('3-5 days');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  // 1. Fetch Doctors list & initial doctor
  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await api.get<{ success: boolean; data: DoctorProfile[] }>('/doctors');
        if (res.success) {
          setDoctors(res.data);
          const initial = res.data.find((d) => d.id === doctorIdParam) || res.data[0];
          setSelectedDoctor(initial || null);
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    }
    loadDoctors();
  }, [doctorIdParam]);

  // 2. Fetch Slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;

    async function loadSlots() {
      try {
        setSlotsLoading(true);
        setError(null);
        setSelectedSlot(null);
        setHoldExpiresAt(null);

        const res = await api.get<{
          success: boolean;
          data: { isOnLeave: boolean; leaveReason?: string; slots: Slot[] };
        }>(`/doctors/${selectedDoctor?.id}/slots?date=${selectedDate}`);

        if (res.success) {
          setIsOnLeave(res.data.isOnLeave);
          setLeaveReason(res.data.leaveReason || '');
          setSlots(res.data.slots || []);
        }
      } catch (err: any) {
        console.error('Failed to load slots:', err);
        setError(err.message || 'Failed to fetch doctor availability');
      } finally {
        setSlotsLoading(false);
      }
    }

    loadSlots();
  }, [selectedDoctor, selectedDate]);

  // 3. Slot Hold countdown timer
  useEffect(() => {
    if (!holdExpiresAt) {
      setHoldTimeLeftSeconds(null);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = holdExpiresAt.getTime() - new Date().getTime();
      if (remainingMs <= 0) {
        setHoldTimeLeftSeconds(0);
        setSelectedSlot(null);
        setHoldExpiresAt(null);
        clearInterval(interval);
      } else {
        setHoldTimeLeftSeconds(Math.floor(remainingMs / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  // Handle Slot Click -> Acquire 5-minute atomic lock
  const handleSlotSelect = async (slot: Slot) => {
    if (!selectedDoctor || !slot.isAvailable) return;
    setError(null);

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        data: { slotHoldId: string; expiresAt: string; slotTime: string };
      }>('/appointments/hold', {
        doctorId: selectedDoctor.id,
        slotTime: slot.slotTime,
      });

      if (res.success) {
        setSelectedSlot(slot);
        setHoldExpiresAt(new Date(res.data.expiresAt));
      }
    } catch (err: any) {
      setError(err.message || 'Unable to reserve slot. It may have just been claimed.');
      // Refresh slots
      if (selectedDoctor && selectedDate) {
        const refreshed = await api.get<{
          success: boolean;
          data: { slots: Slot[] };
        }>(`/doctors/${selectedDoctor.id}/slots?date=${selectedDate}`);
        if (refreshed.success) setSlots(refreshed.data.slots);
      }
    }
  };

  // Submit Booking with Symptoms & AI pre-visit triage
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot) {
      setError('Please select an available appointment slot');
      return;
    }
    if (!symptomsText.trim()) {
      setError('Please describe your symptoms before proceeding');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await api.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/appointments/book', {
        doctorId: selectedDoctor.id,
        slotTime: selectedSlot.slotTime,
        symptomsText,
        duration,
      });

      if (res.success) {
        setConfirmedBooking(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick symptom tag appender
  const handleAddTag = (tag: string) => {
    if (symptomsText.includes(tag)) return;
    setSymptomsText((prev) => (prev ? `${prev}, ${tag}` : tag));
  };

  // Download .ics file
  const handleDownloadIcs = () => {
    if (!confirmedBooking) return;
    const icsString = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AuraHealth AI//EN',
      'BEGIN:VEVENT',
      `UID:${confirmedBooking.id}@aurahealth.ai`,
      `DTSTART:${new Date(confirmedBooking.dateTime).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${new Date(confirmedBooking.endTime).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:AuraHealth: Dr. ${confirmedBooking.doctor?.user?.name || selectedDoctor?.user.name}`,
      `DESCRIPTION:AI Urgency: ${confirmedBooking.symptomIntake?.urgencyLevel}`,
      `LOCATION:${confirmedBooking.meetingLink || 'AuraHealth Virtual Clinic'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AuraHealth_Appointment_${confirmedBooking.id.slice(0, 8)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If Booking Confirmed -> Render Success Screen
  if (confirmedBooking) {
    const intake = confirmedBooking.symptomIntake;
    const questions = intake?.suggestedQuestions
      ? typeof intake.suggestedQuestions === 'string'
        ? JSON.parse(intake.suggestedQuestions)
        : intake.suggestedQuestions
      : [];

    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Appointment Successfully Confirmed!
            </h1>
            <p className="text-sm text-slate-600">
              A confirmation email with calendar invitation has been dispatched to your inbox.
            </p>
          </div>

          {/* Appointment Details Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">
                  {confirmedBooking.doctor?.user?.name || selectedDoctor?.user.name}
                </h3>
                <p className="text-xs text-aura-600 font-semibold">
                  {confirmedBooking.doctor?.specialization || selectedDoctor?.specialization}
                </p>
              </div>
              <UrgencyBadge level={intake?.urgencyLevel || 'MEDIUM'} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 pt-1">
              <div>
                <span className="text-slate-400 block">Date &amp; Time:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(confirmedBooking.dateTime).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Consultation Fee:</span>
                <span className="font-semibold text-slate-900">
                  ${selectedDoctor?.consultationFee.toFixed(2) || '50.00'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Pre-Visit Briefing Dossier */}
          {intake && (
            <div className="bg-gradient-to-br from-aura-50 to-indigo-50/50 p-5 rounded-2xl border border-aura-200/80 space-y-3">
              <div className="flex items-center gap-2 text-aura-800 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-aura-600" />
                <span>AI Clinical Pre-Visit Triage Analysis</span>
              </div>
              <div className="text-xs text-slate-700 space-y-2">
                <div>
                  <span className="font-bold text-slate-900">Chief Complaint: </span>
                  <span>{intake.chiefComplaint}</span>
                </div>
                {questions.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">
                      Doctor's Suggested Diagnostic Questions:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                      {questions.map((q: string, idx: number) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {confirmedBooking.meetingLink && (
              <a
                href={confirmedBooking.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 bg-aura-600 hover:bg-aura-700 text-white font-bold text-xs rounded-xl shadow-md shadow-aura-500/20 transition-colors flex items-center justify-center gap-2 text-center"
              >
                <Video className="w-4 h-4" />
                <span>Join Telehealth Session</span>
              </a>
            )}
            <button
              onClick={handleDownloadIcs}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download .ICS Calendar Event</span>
            </button>
            <Link
              to="/patient/appointments"
              className="py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors text-center"
            >
              View My Appointments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/patient/doctors')}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {rescheduleApptId ? 'Reschedule Priority Appointment' : 'Book Clinical Consultation'}
          </h1>
          <p className="text-xs text-slate-500">
            Select a specialist, lock your slot, and share symptoms for AI pre-consultation analysis.
          </p>
        </div>
      </div>

      {rescheduleApptId && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            You are rescheduling an appointment impacted by doctor leave. Your priority status is active.
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Doctor Picker & Date Selection */}
        <div className="lg:col-span-1 space-y-6">
          {/* Doctor Selection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Selected Physician
            </label>
            <select
              value={selectedDoctor?.id || ''}
              onChange={(e) => {
                const doc = doctors.find((d) => d.id === e.target.value);
                if (doc) setSelectedDoctor(doc);
              }}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-aura-500 bg-white"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.name} ({d.specialization}) - ${d.consultationFee}
                </option>
              ))}
            </select>

            {selectedDoctor && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1.5 border border-slate-100">
                <div className="font-bold text-slate-900">{selectedDoctor.user.name}</div>
                <div className="text-aura-700 font-semibold">{selectedDoctor.specialization}</div>
                <div className="text-[11px] text-slate-500">{selectedDoctor.bio}</div>
                <div className="pt-1 text-[11px] font-bold text-slate-800">
                  Consultation Fee: ${selectedDoctor.consultationFee.toFixed(2)} &bull; Slot:{' '}
                  {selectedDoctor.slotDurationMinutes} mins
                </div>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-aura-600" />
              <span>Select Consultation Date</span>
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-aura-500 bg-white"
            />
          </div>
        </div>

        {/* Middle & Right Column: Interactive Slot Picker & Symptom Intake */}
        <div className="lg:col-span-2 space-y-6">
          {/* Slot Grid Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-aura-600" />
                  <span>Available Time Slots ({selectedDate})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Click a slot to reserve a temporary 5-minute hold.
                </p>
              </div>

              {/* Slot Hold Timer Pill */}
              {holdTimeLeftSeconds !== null && holdTimeLeftSeconds > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-bold animate-pulse">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    Hold Lock: {Math.floor(holdTimeLeftSeconds / 60)}:
                    {String(holdTimeLeftSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {slotsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 py-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : isOnLeave ? (
              <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                <h4 className="font-bold text-amber-900 text-sm">Doctor on Scheduled Leave</h4>
                <p className="text-xs text-amber-700">{leaveReason || 'Please select an alternate date.'}</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No working shifts scheduled for this day. Please select another date.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.slotTime === slot.slotTime;

                  if (slot.status === 'BOOKED') {
                    return (
                      <div
                        key={slot.slotTime}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 text-xs font-medium text-center border border-slate-200 cursor-not-allowed line-through"
                        title="Booked"
                      >
                        {slot.startTimeFormatted}
                      </div>
                    );
                  }

                  if (slot.status === 'HELD_BY_OTHER') {
                    return (
                      <div
                        key={slot.slotTime}
                        className="py-2.5 px-3 rounded-xl bg-amber-50/50 text-amber-600 text-xs font-medium text-center border border-amber-200 cursor-not-allowed flex items-center justify-center gap-1"
                        title="Temporarily reserved by another patient"
                      >
                        <Lock className="w-3 h-3" />
                        <span>{slot.startTimeFormatted}</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.slotTime}
                      type="button"
                      onClick={() => handleSlotSelect(slot)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center border ${
                        isSelected
                          ? 'bg-aura-600 text-white border-aura-600 shadow-md shadow-aura-500/25 scale-[1.02]'
                          : 'bg-white hover:bg-aura-50 text-slate-800 border-slate-200 hover:border-aura-300'
                      }`}
                    >
                      {slot.startTimeFormatted}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Symptom Intake Form */}
          <form onSubmit={handleConfirmBooking} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-aura-600" />
                <h3 className="text-sm font-bold text-slate-900">Pre-Visit Symptom Intake</h3>
              </div>
              <span className="text-[11px] font-bold text-aura-600 bg-aura-50 px-2 py-0.5 rounded-full">
                AI Triage Enabled
              </span>
            </div>

            {/* Quick Symptom Tags */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Quick Select Common Symptoms
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SYMPTOM_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptom Text Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Describe Your Symptoms &amp; Discomfort in Detail
              </label>
              <textarea
                rows={3}
                required
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="e.g. Experiencing sharp chest tightness when walking, accompanied by slight shortness of breath and morning lightheadedness for 4 days..."
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-aura-500 text-xs leading-relaxed"
              />
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Approximate Symptom Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-aura-500 bg-white"
              >
                <option value="Less than 24 hours">Less than 24 hours</option>
                <option value="1-2 days">1-2 days</option>
                <option value="3-5 days">3-5 days</option>
                <option value="1-2 weeks">1-2 weeks</option>
                <option value="Over 1 month">Over 1 month (Chronic)</option>
              </select>
            </div>

            {/* Final Booking Button */}
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="w-full py-3.5 px-4 bg-aura-600 hover:bg-aura-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-aura-500/25 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Analyzing Symptoms &amp; Securing Slot...</span>
              ) : selectedSlot ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirm &amp; Book for {selectedSlot.startTimeFormatted} ({selectedDate})
                  </span>
                </>
              ) : (
                <span>Please Select an Available Time Slot Above</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
