import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export async function getDoctors(req: Request, res: Response): Promise<void> {
  try {
    const { search, specialization } = req.query;

    const where: any = {};
    if (specialization && typeof specialization === 'string' && specialization !== 'All') {
      where.specialization = { contains: specialization };
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { specialization: { contains: search } },
        { user: { name: { contains: search } } },
        { bio: { contains: search } },
      ];
    }

    const doctors = await prisma.doctorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            phone: true,
          },
        },
        leaves: {
          where: {
            status: 'APPROVED',
            endDate: { gte: new Date() },
          },
        },
      },
      orderBy: { rating: 'desc' },
    });

    res.json({ success: true, data: doctors });
  } catch (error: any) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors list' });
  }
}

export async function getDoctorById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            phone: true,
          },
        },
        leaves: {
          where: { status: 'APPROVED' },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    res.json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctor details' });
  }
}

/**
 * Calculates doctor available slots for a chosen date, respecting working hours, active leaves,
 * booked appointments, and concurrency slot holds.
 */
export async function getDoctorAvailableSlots(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id: doctorId } = req.params;
    const { date } = req.query; // format: 'YYYY-MM-DD'
    const patientId = req.user?.id;

    if (!date || typeof date !== 'string') {
      res.status(400).json({ success: false, message: 'Valid date query parameter (YYYY-MM-DD) is required.' });
      return;
    }

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    const targetDate = new Date(`${date}T00:00:00.000Z`);
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // 1. Check if doctor is on approved leave for this date
    const onLeave = await prisma.doctorLeave.findFirst({
      where: {
        doctorId,
        status: 'APPROVED',
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
      },
    });

    if (onLeave) {
      res.json({
        success: true,
        data: {
          isOnLeave: true,
          leaveReason: onLeave.reason || 'Doctor is on scheduled leave',
          slots: [],
        },
      });
      return;
    }

    // 2. Parse working hours for day of week
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = days[targetDate.getUTCDay()];

    let workingSchedule: Record<string, Array<{ start: string; end: string }>> = {};
    try {
      workingSchedule = JSON.parse(doctor.workingHours);
    } catch {
      workingSchedule = {
        mon: [{ start: '09:00', end: '17:00' }],
        tue: [{ start: '09:00', end: '17:00' }],
        wed: [{ start: '09:00', end: '17:00' }],
        thu: [{ start: '09:00', end: '17:00' }],
        fri: [{ start: '09:00', end: '17:00' }],
      };
    }

    const dayHours = workingSchedule[dayName] || [];
    if (dayHours.length === 0) {
      res.json({
        success: true,
        data: {
          isOnLeave: false,
          isNonWorkingDay: true,
          slots: [],
        },
      });
      return;
    }

    // 3. Query existing booked appointments
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        dateTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    });

    const bookedSlotTimes = new Set(existingAppointments.map(a => a.dateTime.toISOString()));

    // 4. Query active slot holds (temporary locks)
    const now = new Date();
    const activeHolds = await prisma.slotHold.findMany({
      where: {
        doctorId,
        slotTime: { gte: startOfDay, lte: endOfDay },
        expiresAt: { gt: now },
      },
    });

    const heldSlotsMap = new Map(activeHolds.map(h => [h.slotTime.toISOString(), h]));

    // 5. Generate discrete time slots
    const slotDuration = doctor.slotDurationMinutes || 30;
    const generatedSlots: Array<{
      slotTime: string;
      startTimeFormatted: string;
      endTimeFormatted: string;
      isAvailable: boolean;
      status: 'AVAILABLE' | 'BOOKED' | 'HELD_BY_OTHER' | 'HELD_BY_YOU';
      holdExpiresAt?: string | null;
    }> = [];

    for (const shift of dayHours) {
      const [startHour, startMin] = shift.start.split(':').map(Number);
      const [endHour, endMin] = shift.end.split(':').map(Number);

      const shiftStartMinutes = startHour * 60 + startMin;
      const shiftEndMinutes = endHour * 60 + endMin;

      for (let current = shiftStartMinutes; current + slotDuration <= shiftEndMinutes; current += slotDuration) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        const hEnd = Math.floor((current + slotDuration) / 60);
        const mEnd = (current + slotDuration) % 60;

        const slotDate = new Date(Date.UTC(
          targetDate.getUTCFullYear(),
          targetDate.getUTCMonth(),
          targetDate.getUTCDate(),
          h,
          m,
          0,
          0
        ));

        const slotIso = slotDate.toISOString();
        const startTimeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const endTimeFormatted = `${String(hEnd).padStart(2, '0')}:${String(mEnd).padStart(2, '0')}`;

        const isBooked = bookedSlotTimes.has(slotIso);
        const activeHold = heldSlotsMap.get(slotIso);

        let status: 'AVAILABLE' | 'BOOKED' | 'HELD_BY_OTHER' | 'HELD_BY_YOU' = 'AVAILABLE';

        if (isBooked) {
          status = 'BOOKED';
        } else if (activeHold) {
          if (patientId && activeHold.patientId === patientId) {
            status = 'HELD_BY_YOU';
          } else {
            status = 'HELD_BY_OTHER';
          }
        }

        generatedSlots.push({
          slotTime: slotIso,
          startTimeFormatted,
          endTimeFormatted,
          isAvailable: status === 'AVAILABLE' || status === 'HELD_BY_YOU',
          status,
          holdExpiresAt: activeHold ? activeHold.expiresAt.toISOString() : null,
        });
      }
    }

    res.json({
      success: true,
      data: {
        isOnLeave: false,
        slots: generatedSlots,
      },
    });
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ success: false, message: 'Failed to compute doctor availability slots' });
  }
}

export async function updateDoctorProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { specialization, bio, experienceYears, consultationFee, slotDurationMinutes } = req.body;
    const doctorId = req.user?.doctorId;

    if (!doctorId) {
      res.status(403).json({ success: false, message: 'User is not linked to a doctor profile' });
      return;
    }

    const updated = await prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        ...(specialization && { specialization }),
        ...(bio !== undefined && { bio }),
        ...(experienceYears && { experienceYears: Number(experienceYears) }),
        ...(consultationFee && { consultationFee: Number(consultationFee) }),
        ...(slotDurationMinutes && { slotDurationMinutes: Number(slotDurationMinutes) }),
      },
    });

    res.json({ success: true, message: 'Profile updated successfully', data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update doctor profile' });
  }
}

export async function updateWorkingHours(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { workingHours } = req.body;
    const doctorId = req.user?.doctorId;

    if (!doctorId) {
      res.status(403).json({ success: false, message: 'User is not linked to a doctor profile' });
      return;
    }

    const jsonString = typeof workingHours === 'string' ? workingHours : JSON.stringify(workingHours);

    const updated = await prisma.doctorProfile.update({
      where: { id: doctorId },
      data: { workingHours: jsonString },
    });

    res.json({ success: true, message: 'Working hours updated successfully', data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update working hours' });
  }
}
