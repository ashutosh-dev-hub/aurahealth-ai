import React from 'react';
import { Activity, ShieldCheck, Heart, Sparkles, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-aura-500 flex items-center justify-center text-white">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                Aura<span className="text-aura-400">Health</span> AI
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Enterprise clinical appointment & automated follow-up platform with atomic concurrency slot locking, multi-role portals, AI pre-visit symptom triage, and scheduled medication reminders.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                <Lock className="w-3 h-3 text-emerald-400" /> Concurrency Safe (TTL Slot Holds)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                <Sparkles className="w-3 h-3 text-aura-400" /> AI Clinical Intelligence
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                <ShieldCheck className="w-3 h-3 text-blue-400" /> HIPAA / RBAC Compliant
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Portals</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-white transition-colors cursor-pointer">Patient Self-Scheduling</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Doctor Consultation Dossier</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Admin Telemetry Hub</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Doctor Leave Conflict Engine</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Resilience & Integrations</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-white transition-colors cursor-pointer">Google Calendar OAuth 2.0</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">RFC 5545 iCalendar Sync</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Medication Adherence Cron</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Heuristic Clinical Fallback</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} AuraHealth AI Systems. Built with precision and care.</p>
          <div className="flex items-center gap-1 mt-2 sm:mt-0">
            <span>Powered by Clean Architecture &amp;</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline mx-0.5" />
          </div>
        </div>
      </div>
    </footer>
  );
};
