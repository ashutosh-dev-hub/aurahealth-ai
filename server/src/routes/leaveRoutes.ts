import { Router } from 'express';
import { createDoctorLeave, getDoctorLeaves } from '../controllers/leaveController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.post('/', authenticate, requireRole('DOCTOR', 'ADMIN'), createDoctorLeave);
router.get('/', authenticate, getDoctorLeaves);

export default router;
