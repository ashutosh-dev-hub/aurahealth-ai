export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULE_REQUIRED';
export type ReminderStatus = 'SCHEDULED' | 'SENT' | 'FAILED' | 'ACKNOWLEDGED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  avatarUrl?: string | null;
  doctorId?: string | null;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialization: string;
  bio?: string | null;
  experienceYears: number;
  consultationFee: number;
  slotDurationMinutes: number;
  workingHours: string;
  rating: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  leaves?: DoctorLeave[];
}

export interface DoctorLeave {
  id: string;
  doctorId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: 'APPROVED' | 'CANCELLED';
  createdAt: string;
  doctor?: {
    user: {
      name: string;
      email: string;
    };
  };
}

export interface Slot {
  slotTime: string;
  startTimeFormatted: string;
  endTimeFormatted: string;
  isAvailable: boolean;
  status: 'AVAILABLE' | 'BOOKED' | 'HELD_BY_OTHER' | 'HELD_BY_YOU';
  holdExpiresAt?: string | null;
}

export interface SymptomIntake {
  id: string;
  appointmentId: string;
  symptomsText: string;
  duration?: string | null;
  urgencyLevel: UrgencyLevel;
  chiefComplaint: string;
  suggestedQuestions: string; // JSON array of string
  rawLlmResponse?: string | null;
  createdAt: string;
}

export interface PrescriptionItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  days: number;
  instructions?: string;
}

export interface ClinicalRecord {
  id: string;
  appointmentId: string;
  clinicalNotes: string;
  diagnosis: string;
  postVisitSummary: string;
  followUpDate?: string | null;
  prescriptions: string; // JSON array of PrescriptionItem
  createdAt: string;
  updatedAt: string;
}

export interface MedicationReminder {
  id: string;
  appointmentId: string;
  patientId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  frequency: string;
  status: ReminderStatus;
  retryCount: number;
  createdAt: string;
  appointment?: Appointment;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  dateTime: string;
  endTime: string;
  status: AppointmentStatus;
  googleCalendarEventId?: string | null;
  meetingLink?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  doctor: DoctorProfile;
  symptomIntake?: SymptomIntake | null;
  clinicalRecord?: ClinicalRecord | null;
  medicationReminders?: MedicationReminder[];
}

export interface NotificationLog {
  id: string;
  recipientEmail: string;
  type: string;
  title: string;
  message: string;
  status: string;
  retryCount: number;
  createdAt: string;
  sentAt?: string | null;
}

export interface AdminStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  appointmentsByStatus: Record<string, number>;
  urgencyDistribution: Record<string, number>;
  notifications: Record<string, number>;
}
