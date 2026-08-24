import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { generatePostVisitSummary } from '../services/aiService.js';
import { sendNotificationEmail } from '../services/emailService.js';
import { ENV } from '../config/env.js';

const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  dosage: z.string().min(1, 'Dosage is required (e.g. 500mg, 1 tablet)'),
  frequency: z.string().min(1, 'Frequency is required (e.g. once daily, twice daily, every 8 hours)'),
  days: z.number().int().min(1, 'Duration in days must be at least 1'),
  instructions: z.string().optional(),
});

const submitClinicalRecordSchema = z.object({
  appointmentId: z.string().uuid(),
  clinicalNotes: z.string().min(5, 'Clinical notes must be at least 5 characters'),
  diagnosis: z.string().min(2, 'Diagnosis is required'),
  prescriptions: z.array(prescriptionItemSchema).default([]),
  followUpDate: z.string().optional().nullable(),
});

/**
 * Doctor submits clinical notes, diagnosis, prescriptions; triggers AI patient summary and sets up medication cron reminders.
 */
export async function submitClinicalRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user || user.role !== 'DOCTOR') {
      res.status(403).json({ success: false, message: 'Forbidden: Only doctors can submit clinical consultation notes.' });
      return;
    }

    const { appointmentId, clinicalNotes, diagnosis, prescriptions, followUpDate } =
      submitClinicalRecordSchema.parse(req.body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    if (appointment.doctorId !== user.doctorId) {
      res.status(403).json({ success: false, message: 'You can only submit records for your own appointments.' });
      return;
    }

    // 1. Generate AI Patient-Friendly Post-Visit Summary
    const aiSummary = await generatePostVisitSummary(
      clinicalNotes,
      diagnosis,
      prescriptions,
      followUpDate || undefined
    );

    // 2. Save Clinical Record & update appointment status in transaction
    const parsedFollowUpDate = followUpDate ? new Date(followUpDate) : null;

    const clinicalRecord = await prisma.$transaction(async (tx) => {
      const record = await tx.clinicalRecord.upsert({
        where: { appointmentId },
        update: {
          clinicalNotes,
          diagnosis,
          postVisitSummary: aiSummary.patientFriendlySummary,
          followUpDate: parsedFollowUpDate,
          prescriptions: JSON.stringify(prescriptions),
        },
        create: {
          appointmentId,
          clinicalNotes,
          diagnosis,
          postVisitSummary: aiSummary.patientFriendlySummary,
          followUpDate: parsedFollowUpDate,
          prescriptions: JSON.stringify(prescriptions),
        },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' },
      });

      // Clear any prior unsent medication reminders for this appointment
      await tx.medicationReminder.deleteMany({
        where: {
          appointmentId,
          status: 'SCHEDULED',
        },
      });

      // 3. Generate structured medication reminder schedules
      const remindersToCreate: Array<{
        appointmentId: string;
        patientId: string;
        medicineName: string;
        dosage: string;
        frequency: string;
        scheduledTime: Date;
        status: 'SCHEDULED';
      }> = [];

      const now = new Date();

      for (const rx of prescriptions) {
        const freqLower = rx.frequency.toLowerCase();
        let hoursOffsets: number[] = [9]; // Default 9 AM

        if (freqLower.includes('twice') || freqLower.includes('2 times') || freqLower.includes('bid')) {
          hoursOffsets = [9, 21]; // 9 AM, 9 PM
        } else if (freqLower.includes('thrice') || freqLower.includes('3 times') || freqLower.includes('tid')) {
          hoursOffsets = [8, 14, 20]; // 8 AM, 2 PM, 8 PM
        } else if (freqLower.includes('every 8') || freqLower.includes('q8h')) {
          hoursOffsets = [6, 14, 22]; // 6 AM, 2 PM, 10 PM
        } else if (freqLower.includes('night') || freqLower.includes('bedtime') || freqLower.includes('hs')) {
          hoursOffsets = [22]; // 10 PM
        }

        for (let day = 0; day < rx.days; day++) {
          for (const hour of hoursOffsets) {
            const reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, 0, 0);

            // If it's today and already passed, schedule a quick reminder 5 mins from now for demo verification
            if (reminderDate <= now && day === 0) {
              remindersToCreate.push({
                appointmentId,
                patientId: appointment.patientId,
                medicineName: rx.medicineName,
                dosage: rx.dosage,
                frequency: rx.frequency,
                scheduledTime: new Date(now.getTime() + 2 * 60 * 1000), // 2 mins from now
                status: 'SCHEDULED',
              });
            } else if (reminderDate > now) {
              remindersToCreate.push({
                appointmentId,
                patientId: appointment.patientId,
                medicineName: rx.medicineName,
                dosage: rx.dosage,
                frequency: rx.frequency,
                scheduledTime: reminderDate,
                status: 'SCHEDULED',
              });
            }
          }
        }
      }

      if (remindersToCreate.length > 0) {
        await tx.medicationReminder.createMany({
          data: remindersToCreate,
        });
      }

      return record;
    });

    // 4. Send Post-Visit Care Plan Email to Patient
    sendNotificationEmail({
      to: appointment.patient.email,
      subject: `Your Care Plan & Post-Visit Summary from Dr. ${appointment.doctor.user.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0284c7;">Post-Visit Summary & Care Plan</h2>
          <p>Hello <strong>${appointment.patient.name}</strong>, Dr. <strong>${appointment.doctor.user.name}</strong> has prepared your clinical summary and prescription plan.</p>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #0284c7;">
            <p><strong>Diagnosis:</strong> ${diagnosis}</p>
            <div style="white-space: pre-line; line-height: 1.6; color: #334155;">${aiSummary.patientFriendlySummary}</div>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${ENV.CLIENT_URL}/patient/appointments/${appointmentId}" style="background: #0284c7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              View Complete Care Plan & Track Prescriptions
            </a>
          </div>
        </div>
      `,
      type: 'BOOKING_CONFIRMATION',
    }).catch(err => console.error('Care plan email failed:', err));

    res.json({
      success: true,
      message: 'Consultation notes submitted, AI patient summary generated, and medication schedule activated!',
      data: clinicalRecord,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message });
      return;
    }
    console.error('Submit clinical record error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit clinical record' });
  }
}
