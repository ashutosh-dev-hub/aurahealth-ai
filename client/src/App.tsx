import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DoctorDirectoryPage } from './pages/patient/DoctorDirectoryPage';
import { BookingFlowPage } from './pages/patient/BookingFlowPage';
import { MyAppointmentsPage } from './pages/patient/MyAppointmentsPage';
import { MedicationTrackerPage } from './pages/patient/MedicationTrackerPage';
import { DoctorDashboardPage } from './pages/doctor/DoctorDashboardPage';
import { ConsultationRoomPage } from './pages/doctor/ConsultationRoomPage';
import { DoctorSchedulePage } from './pages/doctor/DoctorSchedulePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

// Protected Route Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Array<'PATIENT' | 'DOCTOR' | 'ADMIN'>;
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-aura-200 border-t-aura-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'DOCTOR') return <Navigate to="/doctor/dashboard" replace />;
    return <Navigate to="/patient/doctors" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
          <div>
            <Navbar />
            <main>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Patient Routes */}
                <Route
                  path="/patient/doctors"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <DoctorDirectoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patient/book"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <BookingFlowPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patient/appointments"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <MyAppointmentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patient/appointments/:id"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <MyAppointmentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patient/medications"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <MedicationTrackerPage />
                    </ProtectedRoute>
                  }
                />

                {/* Doctor Routes */}
                <Route
                  path="/doctor/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                      <DoctorDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/consultation/:id"
                  element={
                    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                      <ConsultationRoomPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/schedule"
                  element={
                    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                      <DoctorSchedulePage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
