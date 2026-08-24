import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { initBackgroundJobs } from './services/cronService.js';
import { prisma } from './config/prisma.js';
import bcrypt from 'bcryptjs';

const app = express();

// CORS configuration supporting credentials and dynamic origins
app.use(cors({
  origin: true, // Dynamically reflects origin (e.g. https://aurahealth-client.onrender.com or localhost)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Automatic Seeder for Render / Production Zero-Configuration
async function ensureSeedData() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Empty database detected on startup. Auto-seeding preloaded demo personas...');

      const passwordHash = await bcrypt.hash('Password@123', 10);
      const adminPasswordHash = await bcrypt.hash('Admin@123', 10);

      // Admin
      await prisma.user.create({
        data: {
          name: 'Dr. Arthur Vance (Chief Admin)',
          email: 'admin@aurahealth.ai',
          passwordHash: adminPasswordHash,
          role: 'ADMIN',
          phone: '+1 (555) 019-2831',
        },
      });

      // Doctors
      const doctorData = [
        {
          name: 'Dr. Sarah Jenkins, MD',
          email: 'dr.sarah@aurahealth.ai',
          specialization: 'Cardiology',
          bio: 'Board-certified cardiologist specializing in preventive cardiology and diagnostics.',
          experienceYears: 12,
          consultationFee: 120.0,
          slotDurationMinutes: 30,
          rating: 4.95,
        },
        {
          name: 'Dr. Marcus Vance, MD',
          email: 'dr.marcus@aurahealth.ai',
          specialization: 'Neurology',
          bio: 'Specialist in neurological disorders, migraine management, and sleep health.',
          experienceYears: 9,
          consultationFee: 140.0,
          slotDurationMinutes: 30,
          rating: 4.88,
        },
        {
          name: 'Dr. Elena Rostova, MD',
          email: 'dr.elena@aurahealth.ai',
          specialization: 'Pediatrics & Family Medicine',
          bio: 'Compassionate family practitioner with extensive routine wellness experience.',
          experienceYears: 7,
          consultationFee: 85.0,
          slotDurationMinutes: 30,
          rating: 4.92,
        },
        {
          name: 'Dr. Alex Rivera, MD',
          email: 'dr.alex@aurahealth.ai',
          specialization: 'Dermatology',
          bio: 'Expert in clinical dermatology and proactive skin treatments.',
          experienceYears: 6,
          consultationFee: 95.0,
          slotDurationMinutes: 30,
          rating: 4.85,
        },
        {
          name: 'Dr. Priya Sharma, MD',
          email: 'dr.priya@aurahealth.ai',
          specialization: 'Internal Medicine',
          bio: 'Primary care internist dedicated to complex diagnostic evaluations.',
          experienceYears: 11,
          consultationFee: 110.0,
          slotDurationMinutes: 30,
          rating: 4.97,
        },
      ];

      const createdDoctors = [];
      for (const doc of doctorData) {
        const user = await prisma.user.create({
          data: {
            name: doc.name,
            email: doc.email,
            passwordHash,
            role: 'DOCTOR',
            doctorProfile: {
              create: {
                specialization: doc.specialization,
                bio: doc.bio,
                experienceYears: doc.experienceYears,
                consultationFee: doc.consultationFee,
                slotDurationMinutes: doc.slotDurationMinutes,
                rating: doc.rating,
              },
            },
          },
          include: { doctorProfile: true },
        });
        createdDoctors.push(user);
      }

      // Patients
      const patient1 = await prisma.user.create({
        data: {
          name: 'John Doe',
          email: 'patient.john@aurahealth.ai',
          passwordHash,
          role: 'PATIENT',
          phone: '+1 (555) 789-0123',
        },
      });

      const patient2 = await prisma.user.create({
        data: {
          name: 'Emma Watson',
          email: 'patient.emma@aurahealth.ai',
          passwordHash,
          role: 'PATIENT',
          phone: '+1 (555) 890-1234',
        },
      });

      // Sample appointment
      const now = new Date();
      const sarahProfile = createdDoctors[0].doctorProfile!;
      const pastApptDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      pastApptDate.setHours(10, 0, 0, 0);

      const completedAppt = await prisma.appointment.create({
        data: {
          patientId: patient1.id,
          doctorId: sarahProfile.id,
          dateTime: pastApptDate,
          endTime: new Date(pastApptDate.getTime() + 30 * 60 * 1000),
          status: 'COMPLETED',
          meetingLink: 'https://meet.jit.si/AuraHealth-Sarah-John',
          symptomIntake: {
            create: {
              symptomsText: 'Experiencing recurrent mild chest tightness after climbing stairs and slight dizziness.',
              duration: '3 weeks',
              urgencyLevel: 'MEDIUM',
              chiefComplaint: 'Recurrent exertional chest tightness with episodic lightheadedness',
              suggestedQuestions: JSON.stringify([
                'Do you experience radiating discomfort down your left arm or neck?',
                'Have you checked your resting blood pressure during these episodes?',
                'Is there any relief when resting or changing posture?',
              ]),
            },
          },
          clinicalRecord: {
            create: {
              clinicalNotes: 'Patient presented with stage 1 mild exertion angina. Resting ECG shows regular sinus rhythm without ST abnormalities.',
              diagnosis: 'Mild Exertional Angina / Stage 1 Borderline Hypertension',
              postVisitSummary: '### Consultation Summary & Care Plan\n\n**Diagnosis:** Mild Exertional Angina / Stage 1 Borderline Hypertension\n\n**Doctor\'s Assessment:**\nYour resting heart rhythm is stable, but we will monitor your blood pressure closely and begin a mild protective regimen.\n\n**Medication Schedule:**\n1. **Amlodipine (5mg)** - Take **once daily** in the morning with water for **30 days**.\n2. **Aspirin (81mg)** - Take **once daily** after breakfast for **30 days**.\n\n**Next Steps:**\n- Maintain a daily blood pressure log.\n- Schedule follow-up in 4 weeks.',
              followUpDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
              prescriptions: JSON.stringify([
                { medicineName: 'Amlodipine', dosage: '5mg', frequency: 'once daily (morning)', days: 30, instructions: 'Take with full glass of water' },
                { medicineName: 'Aspirin (Low Dose)', dosage: '81mg', frequency: 'once daily (after breakfast)', days: 30, instructions: 'Take after eating' },
              ]),
            },
          },
        },
      });

      // Medication Reminders
      await prisma.medicationReminder.createMany({
        data: [
          {
            appointmentId: completedAppt.id,
            patientId: patient1.id,
            medicineName: 'Amlodipine',
            dosage: '5mg',
            frequency: 'once daily',
            scheduledTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            status: 'SCHEDULED',
          },
          {
            appointmentId: completedAppt.id,
            patientId: patient1.id,
            medicineName: 'Aspirin (Low Dose)',
            dosage: '81mg',
            frequency: 'once daily',
            scheduledTime: new Date(now.getTime() + 14 * 60 * 60 * 1000),
            status: 'SCHEDULED',
          },
        ],
      });

      console.log('✅ Auto-seed completed successfully!');
    }
  } catch (err: any) {
    console.error('Auto-seed check error:', err.message);
  }
}

// Root welcome endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'AuraHealth AI Backend REST API',
    frontendApp: 'https://aurahealth-client.onrender.com/',
    healthCheck: '/api/health',
    endpoints: {
      auth: '/api/auth',
      doctors: '/api/doctors',
      appointments: '/api/appointments',
      consultations: '/api/consultations',
      leaves: '/api/leaves',
      medications: '/api/medications',
      admin: '/api/admin',
    },
  });
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'AuraHealth AI API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    concurrencyProtection: 'ENABLED',
    aiTriageFallback: 'ACTIVE',
  });
});

// Mount API routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred',
  });
});

const port = parseInt(ENV.PORT, 10) || 5000;

app.listen(port, async () => {
  console.log(`🚀 AuraHealth AI Backend Server running on http://localhost:${port}`);
  console.log(`🏥 Health check at http://localhost:${port}/api/health`);
  
  // Ensure database has demo personas
  await ensureSeedData();

  // Start automated cron workers
  initBackgroundJobs();
});

export default app;
