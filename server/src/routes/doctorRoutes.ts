import { Router } from 'express';
import {
  getDoctors,
  getDoctorById,
  getDoctorAvailableSlots,
  updateDoctorProfile,
  updateWorkingHours,
} from '../controllers/doctorController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/slots', authenticate, getDoctorAvailableSlots);
router.put('/profile', authenticate, requireRole('DOCTOR'), updateDoctorProfile);
router.put('/working-hours', authenticate, requireRole('DOCTOR'), updateWorkingHours);

export default router;
