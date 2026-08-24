import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting AuraHealth AI database seed...');

  // Clean existing tables in proper order
  await prisma.notificationLog.deleteMany({});
  await prisma.medicationReminder.deleteMany({});
  await prisma.clinicalRecord.deleteMany({});
  await prisma.symptomIntake.deleteMany({});
  await prisma.slotHold.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.doctorLeave.deleteMany({});
  await prisma.doctorProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('Password@123', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Arthur Vance (Chief Admin)',
      email: 'admin@aurahealth.ai',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      phone: '+1 (555) 019-2831',
    },
  });
  console.log('✅ Created Admin user:', admin.email);

  // 2. Create Doctors
  const doctorData = [
    {
      name: 'Dr. Sarah Jenkins, MD',
      email: 'dr.sarah@aurahealth.ai',
      phone: '+1 (555) 234-5678',
      specialization: 'Cardiology',
      bio: 'Board-certified cardiologist specializing in preventive cardiology, hypertension, and advanced cardiovascular diagnostics.',
      experienceYears: 12,
      consultationFee: 120.0,
      slotDurationMinutes: 30,
      rating: 4.95,
    },
    {
      name: 'Dr. Marcus Vance, MD',
      email: 'dr.marcus@aurahealth.ai',
      phone: '+1 (555) 345-6789',
      specialization: 'Neurology',
      bio: 'Specialist in neurological disorders, migraine management, sleep disorders, and cognitive health.',
      experienceYears: 9,
      consultationFee: 140.0,
      slotDurationMinutes: 30,
      rating: 4.88,
    },
    {
      name: 'Dr. Elena Rostova, MD',
      email: 'dr.elena@aurahealth.ai',
      phone: '+1 (555) 456-7890',
      specialization: 'Pediatrics & Family Medicine',
      bio: 'Compassionate family practitioner and pediatrician with extensive experience in routine wellness, pediatric allergies, and chronic illness care.',
      experienceYears: 7,
      consultationFee: 85.0,
      slotDurationMinutes: 30,
      rating: 4.92,
    },
    {
      name: 'Dr. Alex Rivera, MD',
      email: 'dr.alex@aurahealth.ai',
      phone: '+1 (555) 567-8901',
      specialization: 'Dermatology',
      bio: 'Expert in clinical dermatology, skin lesion evaluations, eczema, and proactive dermatological treatments.',
      experienceYears: 6,
      consultationFee: 95.0,
      slotDurationMinutes: 30,
      rating: 4.85,
    },
    {
      name: 'Dr. Priya Sharma, MD',
      email: 'dr.priya@aurahealth.ai',
      phone: '+1 (555) 678-9012',
      specialization: 'Internal Medicine',
      bio: 'Primary care internist dedicated to complex diagnostic evaluations, diabetic management, and holistic lifestyle wellness.',
      experienceYears: 11,
      consultationFee: 110.0,
      slotDurationMinutes: 30,
      rating: 4.97,
    },
  ];

  const doctors = [];
  for (const doc of doctorData) {
    const user = await prisma.user.create({
      data: {
        name: doc.name,
        email: doc.email,
        passwordHash,
        role: 'DOCTOR',
        phone: doc.phone,
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
    doctors.push(user);
    console.log(`✅ Created Doctor: ${doc.name} (${doc.email})`);
  }

  // 3. Create Patients
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
  console.log('✅ Created Patients: patient.john@aurahealth.ai, patient.emma@aurahealth.ai');

  // 4. Create Sample Appointments with Symptom Intakes & Clinical Records
  const now = new Date();
  const sarahProfile = doctors[0].doctorProfile!;
  const marcusProfile = doctors[1].doctorProfile!;

  // Appointment 1: Completed Past Appointment with Doctor Sarah (Cardiology)
  const pastApptDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  pastApptDate.setHours(10, 0, 0, 0);
  const pastApptEndDate = new Date(pastApptDate.getTime() + 30 * 60 * 1000);

  const completedAppt = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: sarahProfile.id,
      dateTime: pastApptDate,
      endTime: pastApptEndDate,
      status: 'COMPLETED',
      meetingLink: 'https://meet.jit.si/AuraHealth-Sarah-John',
      symptomIntake: {
        create: {
          symptomsText: 'Experiencing recurrent mild chest tightness after climbing stairs and slight dizziness in the mornings.',
          duration: '3 weeks',
          urgencyLevel: 'MEDIUM',
          chiefComplaint: 'Recurrent exertional chest tightness with episodic morning lightheadedness',
          suggestedQuestions: JSON.stringify([
            'Do you experience radiating discomfort down your left arm or neck?',
            'Have you checked your resting blood pressure during these episodes?',
            'Is there any relief when resting or changing posture?',
          ]),
          rawLlmResponse: 'Sample intake analysis parsed successfully.',
        },
      },
      clinicalRecord: {
        create: {
          clinicalNotes: 'Patient presented with stage 1 mild exertion angina. Resting ECG shows regular sinus rhythm without ST abnormalities. Recommended low-sodium dietary adjustments and baseline blood lipid panel.',
          diagnosis: 'Mild Exertional Angina / Stage 1 Borderline Hypertension',
          postVisitSummary: '### Consultation Summary & Care Plan\n\n**Diagnosis:** Mild Exertional Angina / Stage 1 Borderline Hypertension\n\n**Doctor\'s Assessment:**\nYour resting heart rhythm is stable, but your heart is working slightly harder during stairs or sudden physical strain. We will monitor your blood pressure closely and begin a mild protective regimen.\n\n**Medication Schedule:**\n1. **Amlodipine (5mg)** - Take **once daily** in the morning with water for **30 days**.\n2. **Aspirin (81mg)** - Take **once daily** after breakfast for **30 days**.\n\n**Next Steps:**\n- Avoid strenuous heavy lifting until follow-up.\n- Maintain a daily blood pressure log.\n- Schedule follow-up in 4 weeks.',
          followUpDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
          prescriptions: JSON.stringify([
            { medicineName: 'Amlodipine', dosage: '5mg', frequency: 'once daily (morning)', days: 30, instructions: 'Take with full glass of water' },
            { medicineName: 'Aspirin (Low Dose)', dosage: '81mg', frequency: 'once daily (after breakfast)', days: 30, instructions: 'Take after eating' },
          ]),
        },
      },
    },
  });

  // Create active medication reminders for patient1
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

  // Appointment 2: Upcoming High-Urgency Appointment with Doctor Marcus (Neurology)
  const upcomingDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  upcomingDate.setHours(14, 30, 0, 0);
  const upcomingEndDate = new Date(upcomingDate.getTime() + 30 * 60 * 1000);

  await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      doctorId: marcusProfile.id,
      dateTime: upcomingDate,
      endTime: upcomingEndDate,
      status: 'CONFIRMED',
      meetingLink: 'https://meet.jit.si/AuraHealth-Marcus-Emma',
      symptomIntake: {
        create: {
          symptomsText: 'Severe throbbing migraine on the right side of the head with sudden visual aura, sensitivity to light, and mild nausea for 2 days.',
          duration: '2 days',
          urgencyLevel: 'HIGH',
          chiefComplaint: 'Acute debilitating hemicranial migraine with visual aura and photophobia',
          suggestedQuestions: JSON.stringify([
            'Have you experienced any temporary numbness in your fingers or face?',
            'Did this headache come on suddenly like a thunderclap or gradually intensify?',
            'Have standard OTC pain relievers provided any temporary relief?',
          ]),
        },
      },
    },
  });

  // Sample Doctor Leave to demonstrate conflict management
  const leaveStartDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const leaveEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await prisma.doctorLeave.create({
    data: {
      doctorId: doctors[2].doctorProfile!.id,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: 'Attending International Pediatric Health Summit',
      status: 'APPROVED',
    },
  });

  console.log('✨ Seed completed successfully! All demo credentials ready.');
  console.log('\n--- 📋 DEMO LOGIN CREDENTIALS ---');
  console.log('👑 Admin:   admin@aurahealth.ai          | Password: Admin@123');
  console.log('🩺 Doctor:  dr.sarah@aurahealth.ai       | Password: Password@123 (Cardiology)');
  console.log('🩺 Doctor:  dr.marcus@aurahealth.ai      | Password: Password@123 (Neurology)');
  console.log('🩺 Doctor:  dr.elena@aurahealth.ai       | Password: Password@123 (Pediatrics)');
  console.log('🩺 Doctor:  dr.alex@aurahealth.ai        | Password: Password@123 (Dermatology)');
  console.log('🩺 Doctor:  dr.priya@aurahealth.ai       | Password: Password@123 (Internal Med)');
  console.log('👤 Patient: patient.john@aurahealth.ai   | Password: Password@123');
  console.log('👤 Patient: patient.emma@aurahealth.ai   | Password: Password@123');
  console.log('--------------------------------\n');
}

main()
  .catch((e) => {
    console.error('Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
