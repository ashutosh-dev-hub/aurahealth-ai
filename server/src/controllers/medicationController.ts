import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

/**
 * Get medication reminders for the authenticated patient.
 */
export async function getPatientMedicationReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const patientId = req.user?.id;
    if (!patientId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const reminders = await prisma.medicationReminder.findMany({
      where: { patientId },
      include: {
        appointment: {
          include: {
            doctor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    res.json({ success: true, data: reminders });
  } catch (error: any) {
    console.error('Error fetching medication reminders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch medication schedule' });
  }
}

/**
 * Acknowledge / mark a medication dose as taken.
 */
export async function acknowledgeMedicationDose(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const patientId = req.user?.id;

    const reminder = await prisma.medicationReminder.findUnique({
      where: { id },
    });

    if (!reminder) {
      res.status(404).json({ success: false, message: 'Reminder record not found' });
      return;
    }

    if (reminder.patientId !== patientId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const updated = await prisma.medicationReminder.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' },
    });

    res.json({ success: true, message: 'Dose marked as taken!', data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to acknowledge dose' });
  }
}
