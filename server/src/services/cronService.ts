import cron from 'node-cron';
import { prisma } from '../config/prisma.js';
import { sendNotificationEmail, getMedicationReminderEmailTemplate } from './emailService.js';
import { ENV } from '../config/env.js';

/**
 * Initializes all automated background jobs.
 */
export function initBackgroundJobs() {
  console.log('⏰ Initializing AuraHealth Background Cron Scheduler...');

  // 1. Check medication reminders every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const dueReminders = await prisma.medicationReminder.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledTime: { lte: now },
        },
        include: {
          patient: true,
        },
        take: 50,
      });

      for (const reminder of dueReminders) {
        const emailResult = await sendNotificationEmail({
          to: reminder.patient.email,
          subject: `Medication Dose Alert: ${reminder.medicineName} (${reminder.dosage})`,
          html: getMedicationReminderEmailTemplate({
            patientName: reminder.patient.name,
            medicineName: reminder.medicineName,
            dosage: reminder.dosage,
            frequency: reminder.frequency,
            portalUrl: `${ENV.CLIENT_URL}/patient/prescriptions`,
          }),
          type: 'MEDICATION',
        });

        if (emailResult.success) {
          await prisma.medicationReminder.update({
            where: { id: reminder.id },
            data: { status: 'SENT' },
          });
        } else {
          await prisma.medicationReminder.update({
            where: { id: reminder.id },
            data: {
              status: reminder.retryCount >= 3 ? 'FAILED' : 'SCHEDULED',
              retryCount: { increment: 1 },
            },
          });
        }
      }
    } catch (err: any) {
      console.error('Error in medication reminder cron:', err.message);
    }
  });

  // 2. Clean up expired temporary slot locks every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();
      const deleted = await prisma.slotHold.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });
      if (deleted.count > 0) {
        console.log(`🧹 Cleaned up ${deleted.count} expired slot hold lock(s).`);
      }
    } catch (err: any) {
      console.error('Error cleaning expired slot holds:', err.message);
    }
  });

  // 3. Retry failed notifications every 5 minutes with exponential retry threshold
  cron.schedule('*/5 * * * *', async () => {
    try {
      const failedLogs = await prisma.notificationLog.findMany({
        where: {
          status: 'FAILED',
          retryCount: { lt: 4 },
        },
        take: 20,
      });

      for (const log of failedLogs) {
        console.log(`🔁 Retrying failed notification ID: ${log.id} to ${log.recipientEmail}`);
        const result = await sendNotificationEmail({
          to: log.recipientEmail,
          subject: `[Resent] ${log.title}`,
          html: log.message,
          type: log.type as any,
        });

        if (result.success) {
          await prisma.notificationLog.update({
            where: { id: log.id },
            data: { status: 'SENT', sentAt: new Date() },
          });
        } else {
          await prisma.notificationLog.update({
            where: { id: log.id },
            data: { retryCount: { increment: 1 } },
          });
        }
      }
    } catch (err: any) {
      console.error('Error in email retry cron:', err.message);
    }
  });

  // 4. Send 24-hour upcoming appointment reminders every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          dateTime: {
            gte: in24Hours,
            lt: in25Hours,
          },
        },
        include: {
          patient: true,
          doctor: { include: { user: true } },
        },
      });

      for (const appt of upcomingAppointments) {
        await sendNotificationEmail({
          to: appt.patient.email,
          subject: `Appointment Reminder: Tomorrow with Dr. ${appt.doctor.user.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0284c7;">Upcoming Appointment Reminder</h2>
              <p>Hello <strong>${appt.patient.name}</strong>, this is a reminder for your upcoming consultation with <strong>Dr. ${appt.doctor.user.name}</strong> (${appt.doctor.specialization}).</p>
              <p><strong>Date & Time:</strong> ${appt.dateTime.toLocaleString()}</p>
              <p><a href="${ENV.CLIENT_URL}/patient/appointments" style="color: #0284c7; font-weight: bold;">View in Patient Portal</a></p>
            </div>
          `,
          type: 'REMINDER',
        });
      }
    } catch (err: any) {
      console.error('Error in 24h reminder cron:', err.message);
    }
  });
}
