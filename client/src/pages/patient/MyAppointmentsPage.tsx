import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Appointment } from '../../types';
import { api } from '../../services/api';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { Modal } from '../../components/Modal';
import {
  Calendar,
  Clock,
  Video,
  FileText,
  AlertCircle,
  Pill,
  XCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Download,
} from 'lucide-react';

export const MyAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'RESCHEDULE'>('ALL');

  // Modals state
  const [selectedApptForDetails, setSelectedApptForDetails] = useState<Appointment | null>(null);
  const [cancelModalAppt, setCancelModalAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: Appointment[] }>('/appointments');
      if (res.success) {
        setAppointments(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch patient appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancelModalAppt) return;
    try {
      setCancelling(true);
      const res = await api.post(`/appointments/${cancelModalAppt.id}/cancel`, {
        reason: cancelReason || 'Patient requested cancellation',
      });
      if (res) {
        setCancelModalAppt(null);
        setCancelReason('');
        fetchAppointments();
      }
    } catch (err: any) {
      alert(`Failed to cancel: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    if (activeTab === 'UPCOMING') return appt.status === 'CONFIRMED' || appt.status === 'PENDING';
    if (activeTab === 'COMPLETED') return appt.status === 'COMPLETED';
    if (activeTab === 'RESCHEDULE') return appt.status === 'RESCHEDULE_REQUIRED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Consultations &amp; Care Plans
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your upcoming visits, access AI clinical briefings, and review digital prescriptions.
          </p>
        </div>

        <Link
          to="/patient/doctors"
          className="py-2.5 px-4 bg-aura-600 hover:bg-aura-700 text-white font-bold text-xs rounded-xl shadow-md shadow-aura-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Calendar className="w-4 h-4" />
          <span>Book New Appointment</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Consultations ({appointments.length})
        </button>
        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'UPCOMING' ? 'bg-aura-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Upcoming (
          {appointments.filter((a) => a.status === 'CONFIRMED' || a.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Completed Care Plans ({appointments.filter((a) => a.status === 'COMPLETED').length})
        </button>
        <button
          onClick={() => setActiveTab('RESCHEDULE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'RESCHEDULE' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Priority Reschedule Required (
          {appointments.filter((a) => a.status === 'RESCHEDULE_REQUIRED').length})
        </button>
      </div>

      {/* Appointment Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No appointments found</h3>
          <p className="text-xs text-slate-500 mt-1">There are no consultations in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appt) => {
            const intake = appt.symptomIntake;
            const record = appt.clinicalRecord;
            const dateObj = new Date(appt.dateTime);

            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left Block: Doctor Info & Date */}
                <div className="space-y-2 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-bold text-slate-900 text-base">{appt.doctor.user.name}</h3>
                    <span className="text-xs font-semibold text-aura-600 bg-aura-50 px-2 py-0.5 rounded-lg border border-aura-200">
                      {appt.doctor.specialization}
                    </span>

                    {/* Status Badge */}
                    {appt.status === 'CONFIRMED' && (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Confirmed
                      </span>
                    )}
                    {appt.status === 'COMPLETED' && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Completed
                      </span>
                    )}
                    {appt.status === 'RESCHEDULE_REQUIRED' && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                        Doctor On Leave - Reschedule Required
                      </span>
                    )}
                    {appt.status === 'CANCELLED' && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Cancelled
                      </span>
                    )}

                    {intake && <UrgencyBadge level={intake.urgencyLevel} size="sm" />}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-aura-600" />
                      <span>
                        {dateObj.toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-aura-600" />
                      <span>
                        {dateObj.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Chief complaint snippet */}
                  {intake && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      <span className="font-semibold text-slate-700">Complaint:</span>{' '}
                      {intake.chiefComplaint}
                    </p>
                  )}
                </div>

                {/* Right Block: Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Reschedule button if leave conflict */}
                  {appt.status === 'RESCHEDULE_REQUIRED' && (
                    <button
                      onClick={() =>
                        navigate(
                          `/patient/book?doctorId=${appt.doctorId}&rescheduleAppointmentId=${appt.id}`
                        )
                      }
                      className="py-2 px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reschedule Slot</span>
                    </button>
                  )}

                  {/* Telehealth video link */}
                  {appt.meetingLink && appt.status === 'CONFIRMED' && (
                    <a
                      href={appt.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3.5 bg-aura-600 hover:bg-aura-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-aura-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Visit</span>
                    </a>
                  )}

                  {/* View Details / Clinical Care Plan */}
                  <button
                    onClick={() => setSelectedApptForDetails(appt)}
                    className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>{record ? 'Care Plan & Prescriptions' : 'View AI Dossier'}</span>
                  </button>

                  {/* Cancel Button */}
                  {(appt.status === 'CONFIRMED' || appt.status === 'PENDING') && (
                    <button
                      onClick={() => setCancelModalAppt(appt)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Cancel Appointment"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Appointment Details / Clinical Summary Modal */}
      {selectedApptForDetails && (
        <Modal
          isOpen={Boolean(selectedApptForDetails)}
          onClose={() => setSelectedApptForDetails(null)}
          title={`Consultation Record — Dr. ${selectedApptForDetails.doctor.user.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs text-slate-700">
            {/* Header info */}
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {selectedApptForDetails.doctor.user.name}
                </div>
                <div className="text-aura-600 font-semibold">
                  {selectedApptForDetails.doctor.specialization}
                </div>
                <div className="text-slate-500 mt-1">
                  {new Date(selectedApptForDetails.dateTime).toLocaleString()}
                </div>
              </div>
              {selectedApptForDetails.symptomIntake && (
                <UrgencyBadge level={selectedApptForDetails.symptomIntake.urgencyLevel} />
              )}
            </div>

            {/* AI Pre-Visit Section */}
            {selectedApptForDetails.symptomIntake && (
              <div className="bg-aura-50/60 p-4 rounded-xl border border-aura-200 space-y-2">
                <div className="font-bold text-aura-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-aura-600" />
                  <span>Pre-Visit Symptom Analysis</span>
                </div>
                <p>
                  <span className="font-bold text-slate-900">Symptoms Shared: </span>
                  {selectedApptForDetails.symptomIntake.symptomsText}
                </p>
                <p>
                  <span className="font-bold text-slate-900">Chief Complaint: </span>
                  {selectedApptForDetails.symptomIntake.chiefComplaint}
                </p>
              </div>
            )}

            {/* Post-Visit Clinical Summary if Completed */}
            {selectedApptForDetails.clinicalRecord ? (
              <div className="space-y-4">
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2">
                  <div className="font-bold text-emerald-900 text-sm">
                    Diagnosis: {selectedApptForDetails.clinicalRecord.diagnosis}
                  </div>
                  <div className="whitespace-pre-line leading-relaxed text-slate-700 pt-1">
                    {selectedApptForDetails.clinicalRecord.postVisitSummary}
                  </div>
                </div>

                {/* Digital Prescriptions */}
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-aura-600" />
                    <span>Prescribed Medications</span>
                  </h4>

                  {(() => {
                    let rxList = [];
                    try {
                      rxList = JSON.parse(selectedApptForDetails.clinicalRecord.prescriptions);
                    } catch {
                      rxList = [];
                    }

                    if (rxList.length === 0) {
                      return <p className="text-slate-400">No prescriptions recorded.</p>;
                    }

                    return (
                      <div className="space-y-2">
                        {rxList.map((rx: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-slate-900 text-xs">
                                {rx.medicineName} ({rx.dosage})
                              </span>
                              <div className="text-[11px] text-slate-500">
                                Frequency: {rx.frequency} &bull; Duration: {rx.days} days
                              </div>
                              {rx.instructions && (
                                <div className="text-[10px] text-slate-400 italic">
                                  Note: {rx.instructions}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-bold bg-aura-100 text-aura-700 px-2 py-0.5 rounded-full">
                              Active RX
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 border border-slate-200">
                Post-consultation summary and prescriptions will appear here once Dr.{' '}
                {selectedApptForDetails.doctor.user.name} concludes your visit.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Cancel Appointment Modal */}
      {cancelModalAppt && (
        <Modal
          isOpen={Boolean(cancelModalAppt)}
          onClose={() => setCancelModalAppt(null)}
          title="Cancel Appointment"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <p>
              Are you sure you want to cancel your consultation with Dr.{' '}
              <strong>{cancelModalAppt.doctor.user.name}</strong> on{' '}
              <strong>{new Date(cancelModalAppt.dateTime).toLocaleString()}</strong>?
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Cancellation Reason</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, feeling better..."
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancelModalAppt(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
