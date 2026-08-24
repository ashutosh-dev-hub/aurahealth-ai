import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { sendNotificationEmail, getLeaveConflictEmailTemplate } from '../services/emailService.js';
import { ENV } from '../config/env.js';

const createLeaveSchema = z.object({
  doctorId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional(),
});

/**
 * Mark doctor leave, detect overlapping appointments, transition them to RESCHEDULE_REQUIRED, and notify patients.
 */
export async function createDoctorLeave(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { doctorId: reqDoctorId, startDate, endDate, reason } = createLeaveSchema.parse(req.body);

    let targetDoctorId: string;
    if (user.role === 'DOCTOR') {
      if (!user.doctorId) {
        res.status(400).json({ success: false, message: 'Doctor profile not associated' });
        return;
      }
      targetDoctorId = user.doctorId;
    } else if (user.role === 'ADMIN') {
      if (!reqDoctorId) {
        res.status(400).json({ success: false, message: 'Doctor ID is required for admin leave assignment' });
        return;
      }
      targetDoctorId = reqDoctorId;
    } else {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
      return;
    }

    // 1. Fetch Doctor details
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: targetDoctorId },
      include: { user: true },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    // 2. Perform Leave Registration and Overlapping Bookings Transition in a Transaction
    const { leave, impactedAppointments } = await prisma.$transaction(async (tx) => {
      const newLeave = await tx.doctorLeave.create({
        data: {
          doctorId: targetDoctorId,
          startDate: start,
          endDate: end,
          reason: reason || 'Scheduled Leave / Medical Absence',
          status: 'APPROVED',
        },
      });

      // Find all overlapping active appointments
      const conflictingAppointments = await tx.appointment.findMany({
        where: {
          doctorId: targetDoctorId,
          dateTime: { gte: start, lte: end },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        include: {
          patient: true,
        },
      });

      // Update statuses to RESCHEDULE_REQUIRED
      if (conflictingAppointments.length > 0) {
        await tx.appointment.updateMany({
          where: {
            id: { in: conflictingAppointments.map(a => a.id) },
          },
          data: {
            status: 'RESCHEDULE_REQUIRED',
            cancellationReason: `Doctor on leave: ${reason || 'Scheduled absence'}`,
          },
        });
      }

      return { leave: newLeave, impactedAppointments: conflictingAppointments };
    });

    // 3. Dispatch automated high-priority reschedule emails to all affected patients
    for (const appt of impactedAppointments) {
      sendNotificationEmail({
        to: appt.patient.email,
        subject: `⚠️ Action Required: Please Reschedule Your Appointment with Dr. ${doctor.user.name}`,
        html: getLeaveConflictEmailTemplate({
          patientName: appt.patient.name,
          doctorName: doctor.user.name,
          appointmentDateTime: appt.dateTime.toLocaleString(),
          reason: reason || 'Personal / Medical Leave',
          rescheduleUrl: `${ENV.CLIENT_URL}/patient/book?doctorId=${doctor.id}&rescheduleAppointmentId=${appt.id}`,
        }),
        type: 'LEAVE_CONFLICT',
      }).catch(err => console.error(`Failed to send leave conflict email to ${appt.patient.email}:`, err));
    }

    res.status(201).json({
      success: true,
      message: `Doctor leave registered. ${impactedAppointments.length} conflicting booking(s) detected and patients notified.`,
      data: {
        leave,
        impactedCount: impactedAppointments.length,
        impactedAppointments: impactedAppointments.map(a => ({
          id: a.id,
          patientName: a.patient.name,
          patientEmail: a.patient.email,
          dateTime: a.dateTime,
        })),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message });
      return;
    }
    console.error('Create doctor leave error:', error);
    res.status(500).json({ success: false, message: 'Failed to record doctor leave' });
  }
}

/**
 * List leaves for a doctor or all leaves if admin.
 */
export async function getDoctorLeaves(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { doctorId } = req.query;
    const where: any = {};

    if (user.role === 'DOCTOR') {
      where.doctorId = user.doctorId;
    } else if (doctorId && typeof doctorId === 'string') {
      where.doctorId = doctorId;
    }

    const leaves = await prisma.doctorLeave.findMany({
      where,
      include: {
        doctor: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json({ success: true, data: leaves });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctor leaves' });
  }
}
