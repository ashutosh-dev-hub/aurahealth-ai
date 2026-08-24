import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runConcurrencyStressTest() {
  console.log('⚡ Starting AuraHealth Concurrency Double-Booking Prevention Stress Test...');

  const doctor = await prisma.doctorProfile.findFirst({
    include: { user: true },
  });

  if (!doctor) {
    console.error('❌ No doctor found. Please run seed script first.');
    process.exit(1);
  }

  // Create two distinct test patients
  const passwordHash = await bcrypt.hash('TestPass@123', 10);
  const patientA = await prisma.user.upsert({
    where: { email: 'stress.patientA@aurahealth.ai' },
    update: {},
    create: {
      name: 'Stress Test Patient A',
      email: 'stress.patientA@aurahealth.ai',
      passwordHash,
      role: 'PATIENT',
    },
  });

  const patientB = await prisma.user.upsert({
    where: { email: 'stress.patientB@aurahealth.ai' },
    update: {},
    create: {
      name: 'Stress Test Patient B',
      email: 'stress.patientB@aurahealth.ai',
      passwordHash,
      role: 'PATIENT',
    },
  });

  // Pick a distinct slot in the future
  const testSlotTime = new Date('2026-10-15T11:00:00.000Z');
  const testEndTime = new Date('2026-10-15T11:30:00.000Z');

  // Clean up any existing test records for this slot
  await prisma.slotHold.deleteMany({
    where: { doctorId: doctor.id, slotTime: testSlotTime },
  });
  await prisma.appointment.deleteMany({
    where: { doctorId: doctor.id, dateTime: testSlotTime },
  });

  console.log(`🎯 Target Doctor: ${doctor.user.name} (${doctor.id})`);
  console.log(`⏰ Target Slot: ${testSlotTime.toISOString()}`);
  console.log('🚀 Firing 10 simultaneous concurrent booking requests...');

  const attemptsCount = 10;
  const simulatedAttempts = Array.from({ length: attemptsCount }).map((_, idx) => {
    const isEven = idx % 2 === 0;
    const patientId = isEven ? patientA.id : patientB.id;

    return (async () => {
      try {
        // Atomic transaction simulation equivalent to /api/appointments/book
        const res = await prisma.$transaction(async (tx) => {
          const existing = await tx.appointment.findFirst({
            where: {
              doctorId: doctor.id,
              dateTime: testSlotTime,
              status: { in: ['CONFIRMED', 'PENDING'] },
            },
          });

          if (existing) {
            throw new Error('DOUBLE_BOOKING_PREVENTED');
          }

          const appt = await tx.appointment.create({
            data: {
              patientId,
              doctorId: doctor.id,
              dateTime: testSlotTime,
              endTime: testEndTime,
              status: 'CONFIRMED',
              symptomIntake: {
                create: {
                  symptomsText: `Concurrent stress test booking attempt #${idx + 1}`,
                  urgencyLevel: 'LOW',
                  chiefComplaint: 'Automated Concurrency Validation',
                  suggestedQuestions: '[]',
                },
              },
            },
          });

          return appt;
        });

        return { attempt: idx + 1, success: true, appointmentId: res.id, error: null };
      } catch (err: any) {
        return { attempt: idx + 1, success: false, appointmentId: null, error: err.message };
      }
    })();
  });

  const results = await Promise.all(simulatedAttempts);

  const successful = results.filter((r) => r.success);
  const conflictsBlocked = results.filter((r) => !r.success && r.error === 'DOUBLE_BOOKING_PREVENTED');

  console.log('\n--- 📊 STRESS TEST RESULTS ---');
  results.forEach((r) => {
    console.log(
      `Attempt #${String(r.attempt).padStart(2, '0')}: ${
        r.success ? '✅ SUCCESS (Booked Slot)' : `🛡️ BLOCKED (${r.error})`
      }`
    );
  });

  console.log('\n--- 🔍 VERIFICATION ASSERTIONS ---');
  console.log(`Total Requests: ${attemptsCount}`);
  console.log(`Successful Bookings: ${successful.length} (Expected: 1)`);
  console.log(`Safely Blocked Conflicts: ${conflictsBlocked.length} (Expected: ${attemptsCount - 1})`);

  if (successful.length === 1 && conflictsBlocked.length === attemptsCount - 1) {
    console.log('\n🎉 PASS: Strict transaction isolation and concurrency protection passed with 100% accuracy!\n');
  } else {
    console.error('\n❌ FAIL: Race condition detected! Multiple bookings slipped through.\n');
    process.exit(1);
  }

  // Cleanup test appointment
  await prisma.appointment.deleteMany({
    where: { doctorId: doctor.id, dateTime: testSlotTime },
  });
}

runConcurrencyStressTest()
  .catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
