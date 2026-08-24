import { Router } from 'express';
import {
  holdSlot,
  bookAppointment,
  getAppointments,
  getAppointmentById,
  cancelAppointment,
} from '../controllers/appointmentController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/hold', authenticate, holdSlot);
router.post('/book', authenticate, bookAppointment);
router.get('/', authenticate, getAppointments);
router.get('/:id', authenticate, getAppointmentById);
router.post('/:id/cancel', authenticate, cancelAppointment);

export default router;
