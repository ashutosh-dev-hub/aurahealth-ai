import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Appointment, PrescriptionItem } from '../../types';
import { api } from '../../services/api';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import {
  Stethoscope,
  Sparkles,
  Pill,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Calendar,
  AlertCircle,
  Video,
} from 'lucide-react';

export const ConsultationRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      medicineName: '',
      dosage: '500mg',
      frequency: 'twice daily (morning & night)',
      days: 7,
      instructions: 'Take after meals with water',
    },
  ]);

  // Generated Result
  const [completedRecord, setCompletedRecord] = useState<any | null>(null);

  useEffect(() => {
    async function loadAppointment() {
      try {
        setLoading(true);
        const res = await api.get<{ success: boolean; data: Appointment }>(`/appointments/${id}`);
        if (res.success && res.data) {
          setAppointment(res.data);
          if (res.data.clinicalRecord) {
            setDiagnosis(res.data.clinicalRecord.diagnosis);
            setClinicalNotes(res.data.clinicalRecord.clinicalNotes);
            if (res.data.clinicalRecord.followUpDate) {
              setFollowUpDate(res.data.clinicalRecord.followUpDate.split('T')[0]);
            }
            try {
              const rx = JSON.parse(res.data.clinicalRecord.prescriptions);
              if (Array.isArray(rx) && rx.length > 0) setPrescriptions(rx);
            } catch {}
            setCompletedRecord(res.data.clinicalRecord);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load consultation details');
      } finally {
        setLoading(false);
      }
    }

    if (id) loadAppointment();
  }, [id]);

  const handleAddPrescriptionRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      {
        medicineName: '',
        dosage: '1 tablet',
        frequency: 'once daily (morning)',
        days: 5,
        instructions: '',
      },
    ]);
  };

  const handleRemovePrescriptionRow = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePrescriptionChange = (index: number, field: keyof PrescriptionItem, value: any) => {
    setPrescriptions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setError('Please provide a clinical diagnosis');
      return;
    }
    if (!clinicalNotes.trim()) {
      setError('Please enter clinical consultation notes');
      return;
    }

    const validPrescriptions = prescriptions.filter((p) => p.medicineName.trim() !== '');

    try {
      setSubmitting(true);
      setError(null);

      const res = await api.post<{ success: boolean; message: string; data: any }>(
        '/consultations/record',
        {
          appointmentId: id,
          diagnosis,
          clinicalNotes,
          followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
          prescriptions: validPrescriptions,
        }
      );

      if (res.success) {
        setCompletedRecord(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit clinical record');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="h-96 bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Consultation Not Found</h2>
        <button
          onClick={() => navigate('/doctor/dashboard')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const intake = appointment.symptomIntake;
  let suggestedQuestions: string[] = [];
  if (intake?.suggestedQuestions) {
    try {
      suggestedQuestions =
        typeof intake.suggestedQuestions === 'string'
          ? JSON.parse(intake.suggestedQuestions)
          : intake.suggestedQuestions;
    } catch {}
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Clinical Consultation Dossier
            </h1>
            <p className="text-xs text-slate-500">
              Patient: <strong className="text-slate-800">{appointment.patient.name}</strong> ({appointment.patient.email})
            </p>
          </div>
        </div>

        {appointment.meetingLink && (
          <a
            href={appointment.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="py-2.5 px-4 bg-aura-600 hover:bg-aura-700 text-white font-bold text-xs rounded-xl shadow-md shadow-aura-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" />
            <span>Open Telehealth Video</span>
          </a>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notification if Completed */}
      {completedRecord && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Consultation Finalized &amp; AI Patient Care Plan Dispatched!</span>
          </div>
          <p className="text-emerald-700 leading-relaxed">
            The patient has received an automated post-visit summary email, and their medication reminders have been scheduled into the adherence cron worker.
          </p>

          <div className="bg-white p-4 rounded-xl border border-emerald-200/80 text-slate-700 whitespace-pre-line leading-relaxed text-xs">
            {completedRecord.postVisitSummary}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: AI Pre-Visit Dossier */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-aura-800 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-aura-600" />
                <span>AI Pre-Visit Intake</span>
              </div>
              {intake && <UrgencyBadge level={intake.urgencyLevel} size="sm" />}
            </div>

            {intake ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">Chief Complaint:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {intake.chiefComplaint}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">Reported Symptoms:</span>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                    {intake.symptomsText}
                  </p>
                </div>

                {intake.duration && (
                  <div>
                    <span className="font-bold text-slate-900">Duration: </span>
                    <span className="text-slate-600">{intake.duration}</span>
                  </div>
                )}

                {suggestedQuestions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-900 block mb-1.5">
                      Suggested Diagnostic Inquiries:
                    </span>
                    <ul className="space-y-1.5">
                      {suggestedQuestions.map((q, idx) => (
                        <li
                          key={idx}
                          className="bg-aura-50/60 p-2 rounded-lg border border-aura-100 text-slate-700 text-[11px]"
                        >
                          &bull; {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No pre-visit intake recorded.</p>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Clinical Consultation Form */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSubmitConsultation}
            className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-aura-600" />
                <span>Doctor Assessment &amp; Prescriptions</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                Auto-generates patient friendly plan
              </span>
            </div>

            {/* Diagnosis Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary Diagnosis
              </label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Bacterial Sinusitis / Stage 1 Hypertension"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-aura-500"
              />
            </div>

            {/* Clinical Examination Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Clinical Evaluation &amp; Examination Notes
              </label>
              <textarea
                rows={4}
                required
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="e.g. Patient presents with nasal congestion and facial tenderness. Auscultation clear. Recommended hydration and 7-day antibiotic course..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs leading-relaxed focus:ring-2 focus:ring-aura-500"
              />
            </div>

            {/* Digital Prescription Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-aura-600" />
                  <span>Digital Prescription Items</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddPrescriptionRow}
                  className="py-1 px-2.5 bg-aura-50 hover:bg-aura-100 text-aura-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 border border-aura-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Medicine</span>
                </button>
              </div>

              <div className="space-y-3">
                {prescriptions.map((rx, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-700 text-[11px]">Medication #{idx + 1}</span>
                      {prescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePrescriptionRow(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Medicine Name (e.g. Amoxicillin)"
                        value={rx.medicineName}
                        onChange={(e) => handlePrescriptionChange(idx, 'medicineName', e.target.value)}
                        className="p-2 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500mg, 1 tablet)"
                        value={rx.dosage}
                        onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                        className="p-2 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={rx.frequency}
                        onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                        className="p-2 rounded-lg border border-slate-200 text-xs bg-white"
                      >
                        <option value="once daily (morning)">Once daily (morning)</option>
                        <option value="twice daily (morning & night)">Twice daily (morning & night)</option>
                        <option value="thrice daily (8am, 2pm, 8pm)">Thrice daily (8am, 2pm, 8pm)</option>
                        <option value="every 8 hours">Every 8 hours</option>
                        <option value="at bedtime">At bedtime</option>
                        <option value="as needed (SOS)">As needed (SOS for pain)</option>
                      </select>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={90}
                          placeholder="Duration (days)"
                          value={rx.days}
                          onChange={(e) => handlePrescriptionChange(idx, 'days', parseInt(e.target.value, 10) || 1)}
                          className="w-24 p-2 rounded-lg border border-slate-200 text-xs bg-white"
                        />
                        <span className="text-slate-400 text-xs">Days</span>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Special Instructions (e.g. Take with food, avoid dairy)"
                      value={rx.instructions || ''}
                      onChange={(e) => handlePrescriptionChange(idx, 'instructions', e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-up Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-aura-600" />
                <span>Recommended Follow-up Date (Optional)</span>
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Generating AI Care Plan &amp; Scheduling Reminders...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Patient Care Plan &amp; Conclude Visit</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
