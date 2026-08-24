import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment } from '../../types';
import { api } from '../../services/api';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import {
  Stethoscope,
  Calendar,
  Clock,
  Sparkles,
  User,
  CheckCircle2,
  Video,
  ArrowRight,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const DoctorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

  const fetchDoctorAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: Appointment[] }>('/appointments');
      if (res.success) {
        setAppointments(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch doctor appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'CONFIRMED' || a.status === 'PENDING'
  );
  const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
            <span>Clinical Consultation Queue</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Doctor Workspace &amp; AI Dossiers
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Review AI-analyzed pre-visit patient intakes, launch tele-health visits, and record clinical notes with automated patient care plan generation.
          </p>
        </div>

        {/* Quick Stats Block */}
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/15 text-center">
            <div className="text-2xl font-extrabold text-white">{upcomingAppointments.length}</div>
            <div className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">
              Pending Queue
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/15 text-center">
            <div className="text-2xl font-extrabold text-white">{completedAppointments.length}</div>
            <div className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">
              Completed Visits
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Queue List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-aura-600" />
            <span>Scheduled Consultations</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Sorted chronologically by appointment time
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No scheduled consultations</h3>
            <p className="text-xs text-slate-500 mt-1">
              Your patient queue is currently clear. New bookings will automatically populate here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => {
              const intake = appt.symptomIntake;
              const dateObj = new Date(appt.dateTime);
              const isCompleted = appt.status === 'COMPLETED';

              let suggestedQuestions: string[] = [];
              if (intake?.suggestedQuestions) {
                try {
                  suggestedQuestions =
                    typeof intake.suggestedQuestions === 'string'
                      ? JSON.parse(intake.suggestedQuestions)
                      : intake.suggestedQuestions;
                } catch {
                  suggestedQuestions = [];
                }
              }

              return (
                <div
                  key={appt.id}
                  className={`bg-white rounded-2xl border p-6 shadow-sm transition-all ${
                    isCompleted ? 'border-slate-200 bg-slate-50/40' : 'border-aura-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Patient Overview */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{appt.patient.name}</h3>
                            <p className="text-[11px] text-slate-400">{appt.patient.email}</p>
                          </div>
                        </div>

                        {intake && <UrgencyBadge level={intake.urgencyLevel} />}

                        {isCompleted && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            Care Plan Completed
                          </span>
                        )}
                      </div>

                      {/* Date & Time */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-aura-600" />
                          <span>
                            {dateObj.toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-aura-600" />
                          <span>
                            {dateObj.toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* AI Pre-visit Symptom Dossier Box */}
                      {intake && (
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-aura-50/70 to-indigo-50/50 border border-aura-200/70 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 text-aura-900 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-aura-600" />
                            <span>AI Pre-Visit Triage Briefing</span>
                          </div>
                          <p className="text-slate-700">
                            <span className="font-bold text-slate-900">Chief Complaint: </span>
                            {intake.chiefComplaint}
                          </p>
                          <p className="text-slate-600 line-clamp-2">
                            <span className="font-bold text-slate-900">Symptoms: </span>
                            {intake.symptomsText}
                          </p>

                          {suggestedQuestions.length > 0 && (
                            <div className="pt-1">
                              <span className="font-bold text-slate-800 block text-[11px]">
                                AI Suggested Diagnostic Inquiries:
                              </span>
                              <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1 text-[11px]">
                                {suggestedQuestions.map((q, idx) => (
                                  <li key={idx}>{q}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
                      {appt.meetingLink && !isCompleted && (
                        <a
                          href={appt.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2 px-4 bg-aura-600 hover:bg-aura-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Video className="w-4 h-4" />
                          <span>Join Telehealth</span>
                        </a>
                      )}

                      <button
                        onClick={() => navigate(`/doctor/consultation/${appt.id}`)}
                        className={`py-2.5 px-4 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                          isCompleted
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>{isCompleted ? 'Review Care Plan' : 'Conduct Consultation'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
