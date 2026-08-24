import { Router } from 'express';
import authRoutes from './authRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import consultationRoutes from './consultationRoutes.js';
import leaveRoutes from './leaveRoutes.js';
import adminRoutes from './adminRoutes.js';
import medicationRoutes from './medicationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/consultations', consultationRoutes);
router.use('/leaves', leaveRoutes);
router.use('/admin', adminRoutes);
router.use('/medications', medicationRoutes);

export default router;
