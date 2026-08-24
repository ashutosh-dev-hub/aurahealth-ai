import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';

const createDoctorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  specialization: z.string().min(2, 'Specialization is required'),
  experienceYears: z.number().int().min(0).default(3),
  consultationFee: z.number().min(0).default(60),
  slotDurationMinutes: z.number().int().min(10).max(120).default(30),
  bio: z.string().optional(),
  workingHours: z.string().optional(),
});

/**
 * Get comprehensive system administration metrics & health telemetry.
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      appointmentsByStatus,
      urgencyDistribution,
      notificationLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.doctorProfile.count(),
      prisma.appointment.count(),
      prisma.appointment.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.symptomIntake.groupBy({
        by: ['urgencyLevel'],
        _count: { id: true },
      }),
      prisma.notificationLog.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        appointmentsByStatus: appointmentsByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
        urgencyDistribution: urgencyDistribution.reduce((acc, curr) => {
          acc[curr.urgencyLevel] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
        notifications: notificationLogs.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
  }
}

/**
 * Admin onboard new doctor with user profile & clinical preferences.
 */
export async function createDoctor(req: Request, res: Response): Promise<void> {
  try {
    const validated = createDoctorSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ success: false, message: 'A user with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    const defaultSchedule = JSON.stringify({
      mon: [{ start: '09:00', end: '17:00' }],
      tue: [{ start: '09:00', end: '17:00' }],
      wed: [{ start: '09:00', end: '17:00' }],
      thu: [{ start: '09:00', end: '17:00' }],
      fri: [{ start: '09:00', end: '17:00' }],
    });

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email.toLowerCase(),
        passwordHash,
        role: 'DOCTOR',
        phone: validated.phone || null,
        doctorProfile: {
          create: {
            specialization: validated.specialization,
            experienceYears: validated.experienceYears,
            consultationFee: validated.consultationFee,
            slotDurationMinutes: validated.slotDurationMinutes,
            bio: validated.bio || `Specialist in ${validated.specialization}`,
            workingHours: validated.workingHours || defaultSchedule,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: user,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message });
      return;
    }
    console.error('Admin create doctor error:', error);
    res.status(500).json({ success: false, message: 'Failed to create doctor' });
  }
}

/**
 * Update doctor details by Admin.
 */
export async function updateDoctorByAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, specialization, experienceYears, consultationFee, slotDurationMinutes, bio, workingHours } = req.body;

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    if (name && name !== doctor.user.name) {
      await prisma.user.update({
        where: { id: doctor.userId },
        data: { name },
      });
    }

    const updated = await prisma.doctorProfile.update({
      where: { id },
      data: {
        ...(specialization && { specialization }),
        ...(experienceYears !== undefined && { experienceYears: Number(experienceYears) }),
        ...(consultationFee !== undefined && { consultationFee: Number(consultationFee) }),
        ...(slotDurationMinutes !== undefined && { slotDurationMinutes: Number(slotDurationMinutes) }),
        ...(bio !== undefined && { bio }),
        ...(workingHours && {
          workingHours: typeof workingHours === 'string' ? workingHours : JSON.stringify(workingHours),
        }),
      },
      include: { user: true },
    });

    res.json({ success: true, message: 'Doctor profile updated successfully', data: updated });
  } catch (error: any) {
    console.error('Update doctor error:', error);
    res.status(500).json({ success: false, message: 'Failed to update doctor' });
  }
}

/**
 * Get notification logs.
 */
export async function getNotificationLogs(req: Request, res: Response): Promise<void> {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification logs' });
  }
}
