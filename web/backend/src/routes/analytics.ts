import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getSellerAnalytics,
  getDriverAnalytics,
  getAdminAnalytics,
} from '../controllers/analyticsController';

const router = Router();

router.get('/seller', authenticate, requireRole('seller', 'admin'), getSellerAnalytics);

router.get('/driver', authenticate, requireRole('driver', 'admin'), getDriverAnalytics);

router.get('/admin', authenticate, requireRole('admin'), getAdminAnalytics);

export default router;
