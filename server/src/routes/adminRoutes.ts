import { Router } from 'express';
import {
  getDashboardStats,
  createDoctor,
  updateDoctorByAdmin,
  getNotificationLogs,
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', getDashboardStats);
router.post('/doctors', createDoctor);
router.put('/doctors/:id', updateDoctorByAdmin);
router.get('/notifications', getNotificationLogs);

export default router;
