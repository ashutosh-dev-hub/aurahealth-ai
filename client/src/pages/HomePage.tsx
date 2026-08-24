import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Calendar,
  Pill,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, switchRoleDemo } = useAuth();
  const navigate = useNavigate();

  const handleLaunchPersona = async (role: 'PATIENT' | 'DOCTOR' | 'ADMIN', email?: string, redirectPath?: string) => {
    await switchRoleDemo(role, email);
    navigate(redirectPath || (role === 'ADMIN' ? '/admin/dashboard' : role === 'DOCTOR' ? '/doctor/dashboard' : '/patient/doctors'));
  };

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-aura-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-80 h-80 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-aura-50 border border-aura-200 text-aura-700 text-xs font-bold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-aura-600 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Next-Gen Healthcare Orchestration &bull; AI Powered</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
            Smart Clinical Appointments,{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-aura-600 via-sky-600 to-indigo-600">
              AI Triage & Follow-up
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Eliminate double-booking conflicts with atomic slot holds, empower doctors with instant AI pre-visit dossiers, and keep patients adhering to prescriptions with automated reminders.
          </p>

          {/* Quick Demo Persona Launcher Card */}
          <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/80 max-w-4xl mx-auto text-left">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-aura-600" />
                <h3 className="text-base font-bold text-slate-900">1-Click Live Persona Launcher</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Instant Evaluation Ready
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Switch seamlessly between all 3 platform roles with preloaded realistic clinical data:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Patient Persona */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/50 to-white border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
                      Patient
                    </span>
                    <span className="text-xs text-slate-400">👤 John Doe</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Patient Portal</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Book slots with 5-min hold locks, AI symptom intake form, medication tracker.
                  </p>
                </div>
                <button
                  onClick={() => handleLaunchPersona('PATIENT', 'patient.john@aurahealth.ai', '/patient/doctors')}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Launch as Patient</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Doctor Persona */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/50 to-white border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase">
                      Doctor
                    </span>
                    <span className="text-xs text-slate-400">🩺 Dr. Sarah</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Doctor Portal</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Review pre-visit AI dossiers, write clinical notes, trigger AI care plan summaries.
                  </p>
                </div>
                <button
                  onClick={() => handleLaunchPersona('DOCTOR', 'dr.sarah@aurahealth.ai', '/doctor/dashboard')}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Launch as Doctor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Admin Persona */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-50/50 to-white border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 uppercase">
                      Admin
                    </span>
                    <span className="text-xs text-slate-400">👑 Arthur Vance</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Admin Portal</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Doctor onboarding, leave conflict resolution manager, telemetry & email logs.
                  </p>
                </div>
                <button
                  onClick={() => handleLaunchPersona('ADMIN', 'admin@aurahealth.ai', '/admin/dashboard')}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Launch as Admin</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
            Core Architectural Capabilities
          </h2>
          <p className="text-sm text-slate-600">
            Engineered specifically to solve real-world clinical scheduling bottlenecks and patient follow-up drop-offs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Concurrency Safe Booking */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Atomic Slot Holds</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Acquires a 5-minute exclusive reservation lock before checkout. Database transaction isolation prevents double-booking under aggressive concurrent requests.
            </p>
            <div className="text-xs font-semibold text-blue-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> 100% Race Condition Immune
            </div>
          </div>

          {/* Card 2: AI Pre-Visit Triage */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Dual AI Clinical Pipeline</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Analyzes symptoms to compute urgency level (Low/Medium/High) and 3 diagnostic questions for doctors. Automatically generates layman care plans after visits.
            </p>
            <div className="text-xs font-semibold text-purple-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Heuristic Fallback Guarantees Zero Downtime
            </div>
          </div>

          {/* Card 3: Leave Conflict Engine */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Leave Conflict Engine</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              When doctors schedule leave, overlapping bookings are instantly transitioned to priority reschedule mode and patients are notified via automated email queue.
            </p>
            <div className="text-xs font-semibold text-amber-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Priority Rescheduling Pipeline
            </div>
          </div>
        </div>
      </section>

      {/* Medication Adherence Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-aura-950 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aura-500/20 text-aura-300 text-xs font-bold mb-4 border border-aura-500/30">
              <Pill className="w-3.5 h-3.5 text-aura-400" /> Automated Cron Worker
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Continuous Medication Reminders
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
              Post-consultation prescriptions are automatically parsed by frequency into daily cron notification triggers. Patients receive timely dose reminders and can acknowledge taken medications on their dashboard.
            </p>
            <button
              onClick={() => handleLaunchPersona('PATIENT', 'patient.john@aurahealth.ai', '/patient/medications')}
              className="px-6 py-3 rounded-xl bg-aura-500 hover:bg-aura-400 text-slate-950 font-bold text-sm shadow-lg shadow-aura-500/25 transition-all flex items-center gap-2"
            >
              <span>Explore Medication Tracker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
