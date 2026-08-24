import React, { useState, useEffect } from 'react';
import { AdminStats, DoctorProfile, NotificationLog } from '../../types';
import { api } from '../../services/api';
import { Modal } from '../../components/Modal';
import {
  ShieldCheck,
  Users,
  Stethoscope,
  Calendar,
  Activity,
  Plus,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [tab, setTab] = useState<'OVERVIEW' | 'DOCTORS' | 'NOTIFICATIONS'>('OVERVIEW');

  // Create Doctor Modal
  const [createDoctorOpen, setCreateDoctorOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPassword, setDocPassword] = useState('Password@123');
  const [docSpecialization, setDocSpecialization] = useState('Cardiology');
  const [docExp, setDocExp] = useState(5);
  const [docFee, setDocFee] = useState(75);
  const [docSlotDuration, setDocSlotDuration] = useState(30);
  const [docBio, setDocBio] = useState('');
  const [creatingDoc, setCreatingDoc] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, docsRes, logsRes] = await Promise.all([
        api.get<{ success: boolean; data: AdminStats }>('/admin/stats'),
        api.get<{ success: boolean; data: DoctorProfile[] }>('/doctors'),
        api.get<{ success: boolean; data: NotificationLog[] }>('/admin/notifications'),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (docsRes.success) setDoctors(docsRes.data);
      if (logsRes.success) setLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to fetch admin dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingDoc(true);
      const res = await api.post<{ success: boolean; message: string }>('/admin/doctors', {
        name: docName,
        email: docEmail,
        password: docPassword,
        specialization: docSpecialization,
        experienceYears: Number(docExp),
        consultationFee: Number(docFee),
        slotDurationMinutes: Number(docSlotDuration),
        bio: docBio,
      });

      if (res.success) {
        setCreateDoctorOpen(false);
        setDocName('');
        setDocEmail('');
        setDocBio('');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(`Failed to create doctor: ${err.message}`);
    } finally {
      setCreatingDoc(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Hospital Telemetry &amp; Governance Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Administrative Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitor clinical capacity, manage doctor profiles, oversee leave conflicts, and inspect automated notification queues.
          </p>
        </div>

        <button
          onClick={() => setCreateDoctorOpen(true)}
          className="py-3 px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 shrink-0 self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Physician</span>
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'OVERVIEW' ? 'bg-purple-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          System Overview &amp; Health
        </button>
        <button
          onClick={() => setTab('DOCTORS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'DOCTORS' ? 'bg-purple-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Physicians Management ({doctors.length})
        </button>
        <button
          onClick={() => setTab('NOTIFICATIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'NOTIFICATIONS' ? 'bg-purple-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Notification Audit Logs ({logs.length})
        </button>
      </div>

      {/* Tab 1: System Overview */}
      {tab === 'OVERVIEW' && (
        <div className="space-y-8">
          {/* Key Stat Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Registered Patients</span>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {stats?.totalPatients ?? '...'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Verified patient accounts</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Physicians</span>
                <Stethoscope className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {stats?.totalDoctors ?? '...'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Board-certified doctors</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Consultations</span>
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {stats?.totalAppointments ?? '...'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Managed across all roles</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Notification Delivery</span>
                <Mail className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {stats?.notifications?.['SENT'] ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats?.notifications?.['FAILED'] ?? 0} Retried / In Queue
              </p>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Urgency Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-500" />
                <span>AI Clinical Urgency Distribution</span>
              </h3>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-rose-700">High Urgency Cases</span>
                    <span>{stats?.urgencyDistribution?.['HIGH'] ?? 0}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((stats?.urgencyDistribution?.['HIGH'] ?? 0) / (stats?.totalAppointments || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-amber-700">Medium Urgency Cases</span>
                    <span>{stats?.urgencyDistribution?.['MEDIUM'] ?? 0}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((stats?.urgencyDistribution?.['MEDIUM'] ?? 0) / (stats?.totalAppointments || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-emerald-700">Low Urgency Cases</span>
                    <span>{stats?.urgencyDistribution?.['LOW'] ?? 0}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          ((stats?.urgencyDistribution?.['LOW'] ?? 0) / (stats?.totalAppointments || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Statuses */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-aura-600" />
                <span>Appointment Status Roster</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="font-bold text-blue-900 text-lg">
                    {stats?.appointmentsByStatus?.['CONFIRMED'] ?? 0}
                  </div>
                  <span className="text-blue-700 font-medium">Confirmed / Upcoming</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="font-bold text-emerald-900 text-lg">
                    {stats?.appointmentsByStatus?.['COMPLETED'] ?? 0}
                  </div>
                  <span className="text-emerald-700 font-medium">Completed Care Plans</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="font-bold text-amber-900 text-lg">
                    {stats?.appointmentsByStatus?.['RESCHEDULE_REQUIRED'] ?? 0}
                  </div>
                  <span className="text-amber-700 font-medium">Leave Reschedules</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-700 text-lg">
                    {stats?.appointmentsByStatus?.['CANCELLED'] ?? 0}
                  </div>
                  <span className="text-slate-500 font-medium">Cancelled Visits</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Physicians Management */}
      {tab === 'DOCTORS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Hospital Physician Directory</h3>
            <button
              onClick={() => setCreateDoctorOpen(true)}
              className="py-2 px-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Doctor</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {doctors.map((doc) => (
              <div key={doc.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{doc.user.name}</h4>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="text-purple-700 font-semibold">{doc.specialization}</span>
                    <span>&bull;</span>
                    <span>{doc.experienceYears} Years Exp.</span>
                    <span>&bull;</span>
                    <span>Slot: {doc.slotDurationMinutes} mins</span>
                    <span>&bull;</span>
                    <span className="font-semibold text-slate-800">${doc.consultationFee.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{doc.user.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Active &bull; {doc.rating.toFixed(1)} ★
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Notification Audit Logs */}
      {tab === 'NOTIFICATIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-aura-600" />
              <span>System Notification Audit Logs</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Automatic Backoff Retries Active</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {logs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{log.title}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                      {log.type}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">To: {log.recipientEmail}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      log.status === 'SENT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboard New Doctor Modal */}
      {createDoctorOpen && (
        <Modal
          isOpen={createDoctorOpen}
          onClose={() => setCreateDoctorOpen(false)}
          title="Onboard New Medical Physician"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateDoctor} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Doctor Full Name</label>
              <input
                type="text"
                required
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Dr. Gregory House, MD"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={docEmail}
                onChange={(e) => setDocEmail(e.target.value)}
                placeholder="dr.house@aurahealth.ai"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Specialization</label>
              <select
                value={docSpecialization}
                onChange={(e) => setDocSpecialization(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Pediatrics & Family Medicine">Pediatrics &amp; Family Medicine</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Psychiatry & Behavioral Health">Psychiatry &amp; Behavioral Health</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Exp. (Years)</label>
                <input
                  type="number"
                  min={0}
                  value={docExp}
                  onChange={(e) => setDocExp(parseInt(e.target.value, 10) || 1)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fee ($)</label>
                <input
                  type="number"
                  min={0}
                  value={docFee}
                  onChange={(e) => setDocFee(parseFloat(e.target.value) || 50)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Slot Duration</label>
                <select
                  value={docSlotDuration}
                  onChange={(e) => setDocSlotDuration(parseInt(e.target.value, 10) || 30)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value={15}>15 mins</option>
                  <option value={20}>20 mins</option>
                  <option value={30}>30 mins</option>
                  <option value={45}>45 mins</option>
                  <option value={60}>60 mins</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Physician Bio</label>
              <textarea
                rows={2}
                value={docBio}
                onChange={(e) => setDocBio(e.target.value)}
                placeholder="Diagnostic specialties, hospital affiliations, patient reviews..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateDoctorOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingDoc}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
              >
                {creatingDoc ? 'Creating Physician...' : 'Onboard Physician'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
