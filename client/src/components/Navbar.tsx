import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Calendar,
  Pill,
  Users,
  ShieldCheck,
  LogOut,
  ChevronDown,
  UserCheck,
  Stethoscope,
  Clock,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, switchRoleDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-aura-600 to-aura-400 flex items-center justify-center text-white shadow-md shadow-aura-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">
                  Aura<span className="text-aura-600">Health</span>
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-aura-100 text-aura-700">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Clinical Care Platform
              </p>
            </div>
          </Link>

          {/* Navigation Links according to Role */}
          <nav className="hidden md:flex items-center gap-1">
            {user?.role === 'PATIENT' && (
              <>
                <Link
                  to="/patient/doctors"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/patient/doctors')
                      ? 'bg-aura-50 text-aura-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Find Doctors
                </Link>
                <Link
                  to="/patient/appointments"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/patient/appointments')
                      ? 'bg-aura-50 text-aura-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  My Appointments
                </Link>
                <Link
                  to="/patient/medications"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/patient/medications')
                      ? 'bg-aura-50 text-aura-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Pill className="w-4 h-4" />
                  Medication Tracker
                </Link>
              </>
            )}

            {user?.role === 'DOCTOR' && (
              <>
                <Link
                  to="/doctor/dashboard"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/doctor/dashboard')
                      ? 'bg-aura-50 text-aura-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  Consultation Queue
                </Link>
                <Link
                  to="/doctor/schedule"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/doctor/schedule')
                      ? 'bg-aura-50 text-aura-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Schedule & Leaves
                </Link>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/admin/dashboard')
                      ? 'bg-aura-50 text-aura-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Command Center
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Bar: Demo Role Switcher + User Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-900 text-xs font-semibold rounded-lg shadow-sm hover:bg-amber-100/70 transition-all"
                title="Quick Demo Role Switcher"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Demo Switcher</span>
                <ChevronDown className="w-3 h-3 text-amber-700" />
              </button>

              {demoMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setDemoMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    Switch Test Persona
                  </div>
                  <button
                    onClick={() => {
                      switchRoleDemo('PATIENT', 'patient.john@aurahealth.ai');
                      setDemoMenuOpen(false);
                      navigate('/patient/doctors');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">👤 John Doe (Patient)</div>
                      <div className="text-[10px] text-slate-400">patient.john@aurahealth.ai</div>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">Patient</span>
                  </button>

                  <button
                    onClick={() => {
                      switchRoleDemo('DOCTOR', 'dr.sarah@aurahealth.ai');
                      setDemoMenuOpen(false);
                      navigate('/doctor/dashboard');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">🩺 Dr. Sarah Jenkins</div>
                      <div className="text-[10px] text-slate-400">Cardiology Specialist</div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Doctor</span>
                  </button>

                  <button
                    onClick={() => {
                      switchRoleDemo('DOCTOR', 'dr.marcus@aurahealth.ai');
                      setDemoMenuOpen(false);
                      navigate('/doctor/dashboard');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">🧠 Dr. Marcus Vance</div>
                      <div className="text-[10px] text-slate-400">Neurology Specialist</div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Doctor</span>
                  </button>

                  <button
                    onClick={() => {
                      switchRoleDemo('ADMIN', 'admin@aurahealth.ai');
                      setDemoMenuOpen(false);
                      navigate('/admin/dashboard');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between border-t border-slate-100"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">👑 Chief Administrator</div>
                      <div className="text-[10px] text-slate-400">admin@aurahealth.ai</div>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">Admin</span>
                  </button>
                </div>
              )}
            </div>

            {/* User Session Bar */}
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 uppercase">
                    {user.name.slice(0, 2)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-slate-800 leading-tight">{user.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium capitalize">{user.role.toLowerCase()}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-aura-600 hover:bg-aura-700 rounded-lg shadow-sm shadow-aura-500/20"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
