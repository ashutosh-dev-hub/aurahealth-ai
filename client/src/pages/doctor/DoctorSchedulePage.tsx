import React, { useState, useEffect } from 'react';
import { DoctorLeave } from '../../types';
import { api } from '../../services/api';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  AlertCircle,
  Users,
} from 'lucide-react';

export const DoctorSchedulePage: React.FC = () => {
  const [leaves, setLeaves] = useState<DoctorLeave[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Leave form
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveImpactResult, setLeaveImpactResult] = useState<{
    impactedCount: number;
    impactedAppointments: Array<{ id: string; patientName: string; dateTime: string }>;
  } | null>(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: DoctorLeave[] }>('/leaves');
      if (res.success) {
        setLeaves(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch doctor leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Please provide start and end dates');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setLeaveImpactResult(null);

      const res = await api.post<{
        success: boolean;
        message: string;
        data: {
          leave: DoctorLeave;
          impactedCount: number;
          impactedAppointments: Array<{ id: string; patientName: string; dateTime: string }>;
        };
      }>('/leaves', {
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason: reason || 'Scheduled Absence',
      });

      if (res.success) {
        setLeaveImpactResult({
          impactedCount: res.data.impactedCount,
          impactedAppointments: res.data.impactedAppointments,
        });
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchLeaves();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Schedule &amp; Leave Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure availability and register planned absences with automated patient conflict resolution.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leave Conflict Resolution Success Alert */}
      {leaveImpactResult && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>
              Leave Registered &bull; {leaveImpactResult.impactedCount} Overlapping Booking(s) Handled
            </span>
          </div>
          <p className="text-amber-800 leading-relaxed">
            All impacted patient consultations have been automatically shifted to <strong>RESCHEDULE_REQUIRED</strong> status, and automated priority reschedule notices have been dispatched via email.
          </p>

          {leaveImpactResult.impactedAppointments.length > 0 && (
            <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-1.5">
              <span className="font-bold text-slate-900 block text-[11px]">
                Notified Impacted Patients:
              </span>
              {leaveImpactResult.impactedAppointments.map((a) => (
                <div key={a.id} className="text-slate-600 text-[11px]">
                  &bull; <strong>{a.patientName}</strong> &mdash;{' '}
                  {new Date(a.dateTime).toLocaleString()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Apply for Leave */}
        <div className="lg:col-span-1 space-y-6">
          <form
            onSubmit={handleApplyLeave}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-aura-600" />
              <span>Schedule Doctor Leave</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Leave Start Date &amp; Time
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-aura-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Leave End Date &amp; Time
              </label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-aura-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason / Note for Patients
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Attending Annual Cardiology Conference / Medical leave..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-aura-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Checking Conflicts &amp; Registering...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Register Leave &amp; Notify Patients</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Scheduled Leaves Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-aura-600" />
              <span>Registered Leaves &amp; Absences</span>
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : leaves.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No leaves registered</p>
                <p className="text-xs text-slate-400 mt-1">You are currently fully available for bookings.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map((l) => (
                  <div
                    key={l.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {new Date(l.startDate).toLocaleDateString()} &mdash;{' '}
                        {new Date(l.endDate).toLocaleDateString()}
                      </div>
                      <p className="text-slate-500 mt-0.5">{l.reason || 'Personal Leave'}</p>
                    </div>

                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full text-[11px] self-start sm:self-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approved</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
