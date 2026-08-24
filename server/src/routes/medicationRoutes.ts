import { Router } from 'express';
import {
  getPatientMedicationReminders,
  acknowledgeMedicationDose,
} from '../controllers/medicationController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticate, getPatientMedicationReminders);
router.post('/:id/acknowledge', authenticate, acknowledgeMedicationDose);

export default router;
