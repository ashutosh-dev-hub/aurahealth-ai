import { Router } from 'express';
import { submitClinicalRecord } from '../controllers/consultationController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.post('/record', authenticate, requireRole('DOCTOR'), submitClinicalRecord);

export default router;
