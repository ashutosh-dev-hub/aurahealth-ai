import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoctorProfile } from '../../types';
import { api } from '../../services/api';
import {
  Search,
  Stethoscope,
  Star,
  Clock,
  DollarSign,
  Calendar,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

const SPECIALIZATIONS = [
  'All',
  'Cardiology',
  'Neurology',
  'Pediatrics & Family Medicine',
  'Dermatology',
  'Internal Medicine',
];

export const DoctorDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('All');

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpec]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSpec !== 'All') params.append('specialization', selectedSpec);
      if (search) params.append('search', search);

      const response = await api.get<{ success: boolean; data: DoctorProfile[] }>(
        `/doctors?${params.toString()}`
      );
      if (response.success) {
        setDoctors(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-aura-900 via-aura-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aura-500/20 text-aura-300 text-xs font-bold mb-3 border border-aura-500/30">
            <Sparkles className="w-3.5 h-3.5 text-aura-400" /> AI Intake Integrated
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
            Find Specialists &amp; Book Instantly
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            Select an expert physician, describe your symptoms, and secure your slot with 5-minute concurrency hold protection.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor name, condition, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-aura-500 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-aura-600 hover:bg-aura-700 text-white font-bold text-sm rounded-xl transition-colors shrink-0 shadow-sm shadow-aura-500/20"
          >
            Search
          </button>
        </form>

        {/* Specialization Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SPECIALIZATIONS.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpec(spec)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSpec === spec
                  ? 'bg-aura-600 text-white shadow-sm shadow-aura-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No doctors found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or selecting a different specialization.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => {
            const hasActiveLeave = doctor.leaves && doctor.leaves.length > 0;

            return (
              <div
                key={doctor.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-aura-300 transition-all flex flex-col justify-between p-6"
              >
                <div>
                  {/* Doctor Card Top */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-aura-100 to-sky-200 text-aura-800 flex items-center justify-center font-extrabold text-base border border-aura-200 shrink-0">
                        {doctor.user.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {doctor.user.name}
                        </h3>
                        <p className="text-xs font-semibold text-aura-600">{doctor.specialization}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-amber-700 text-xs font-bold shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{doctor.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {doctor.bio || 'Dedicated specialist committed to patient-first diagnosis and comprehensive care plans.'}
                  </p>

                  {/* Details Badges */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doctor.experienceYears} Years Exp.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-900">${doctor.consultationFee.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400">/ visit</span>
                    </div>
                  </div>

                  {hasActiveLeave && (
                    <div className="mb-4 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Scheduled leave upcoming</span>
                    </div>
                  )}
                </div>

                {/* Book Consultation Button */}
                <button
                  onClick={() => navigate(`/patient/book?doctorId=${doctor.id}`)}
                  className="w-full py-2.5 px-4 bg-aura-600 hover:bg-aura-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-aura-500/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Consultation Slot</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
