import React, { useState, useEffect } from 'react';
import { MedicationReminder } from '../../types';
import { api } from '../../services/api';
import {
  Pill,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Activity,
  Sparkles,
} from 'lucide-react';

export const MedicationTrackerPage: React.FC = () => {
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: MedicationReminder[] }>('/medications');
      if (res.success) {
        setReminders(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch medication reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeDose = async (id: string) => {
    try {
      setUpdatingId(id);
      const res = await api.post<{ success: boolean }>(`/medications/${id}/acknowledge`);
      if (res.success) {
        fetchReminders();
      }
    } catch (err: any) {
      alert(`Error acknowledging dose: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Stats calculation
  const totalDoses = reminders.length;
  const takenDoses = reminders.filter((r) => r.status === 'ACKNOWLEDGED').length;
  const adherencePct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Stats Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-aura-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aura-500/20 text-aura-300 text-xs font-bold border border-aura-500/30">
            <Pill className="w-3.5 h-3.5 text-aura-400" />
            <span>Prescription Adherence Tracker</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Medication Schedule &amp; Follow-up
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Automated reminders are calculated based on frequency from your doctor's clinical prescription. Check off your daily doses to stay consistent.
          </p>
        </div>

        {/* Adherence Score Box */}
        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 rounded-full bg-aura-500/20 border-2 border-aura-400 flex items-center justify-center font-extrabold text-xl text-aura-300 shadow-inner">
            {adherencePct}%
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Adherence Rate</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {takenDoses} of {totalDoses} Doses Logged
            </div>
          </div>
        </div>
      </div>

      {/* Medication Doses Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-aura-600" />
            <span>Active Prescription Schedules</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Background Cron Worker Active (1-min frequency check)
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No active medication schedules</p>
            <p className="text-xs text-slate-400 mt-1">
              Medication reminders are automatically scheduled when your doctor finishes a consultation and issues a prescription.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const scheduled = new Date(reminder.scheduledTime);
              const isAcknowledged = reminder.status === 'ACKNOWLEDGED';
              const isSent = reminder.status === 'SENT';

              return (
                <div
                  key={reminder.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isAcknowledged
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : isSent
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isAcknowledged
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-aura-100 text-aura-700'
                      }`}
                    >
                      <Pill className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{reminder.medicineName}</h4>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {reminder.dosage}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {scheduled.toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Clock className="w-3 h-3 text-aura-600" />
                          {scheduled.toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>Frequency: {reminder.frequency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Action */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {isAcknowledged ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Dose Taken</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledgeDose(reminder.id)}
                        disabled={updatingId === reminder.id}
                        className="py-1.5 px-3.5 bg-aura-600 hover:bg-aura-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-aura-500/20 transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark as Taken</span>
                      </button>
                    )}
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
