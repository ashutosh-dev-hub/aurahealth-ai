import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Activity, Lock, Mail, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchRoleDemo } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post<{ success: boolean; data: { token: string; user: any } }>('/auth/login', {
        email,
        password,
      });

      if (response.success && response.data) {
        login(response.data.token, response.data.user);
        const role = response.data.user.role;
        if (role === 'ADMIN') navigate('/admin/dashboard');
        else if (role === 'DOCTOR') navigate('/doctor/dashboard');
        else navigate('/patient/doctors');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: 'PATIENT' | 'DOCTOR' | 'ADMIN', demoEmail: string) => {
    await switchRoleDemo(role, demoEmail);
    if (role === 'ADMIN') navigate('/admin/dashboard');
    else if (role === 'DOCTOR') navigate('/doctor/dashboard');
    else navigate('/patient/doctors');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Card Header */}
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-aura-600 to-aura-400 items-center justify-center text-white shadow-lg shadow-aura-500/20 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign in to Aura<span className="text-aura-600">Health</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Access your healthcare management workspace</p>
        </div>

        {/* 1-Click Demo Buttons */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2.5">
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>1-Click Test Personas (Evaluator Quick Access)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('PATIENT', 'patient.john@aurahealth.ai')}
              className="py-1.5 px-2 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-[11px] font-bold text-slate-800 transition-colors text-center"
            >
              👤 Patient
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('DOCTOR', 'dr.sarah@aurahealth.ai')}
              className="py-1.5 px-2 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-[11px] font-bold text-slate-800 transition-colors text-center"
            >
              🩺 Doctor
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('ADMIN', 'admin@aurahealth.ai')}
              className="py-1.5 px-2 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-[11px] font-bold text-slate-800 transition-colors text-center"
            >
              👑 Admin
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aurahealth.ai"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-aura-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-aura-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-aura-600 hover:bg-aura-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md shadow-aura-500/20 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-aura-600 hover:underline">
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
