import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getAvailable,
  acceptDelivery,
  updateDeliveryStatus,
  getDriverHistory,
  getDriverEarnings,
} from '../controllers/deliveryController';

const router = Router();

/* ── Routes ───────────────────────────────────────────────── */

// NOTE: static routes (/available, /history, /earnings) must be declared
// before the parametric route (/:id/...) so Express matches them first.

router.get(
  '/available',
  authenticate,
  requireRole('driver', 'admin'),
  getAvailable,
);

router.get(
  '/history',
  authenticate,
  requireRole('driver', 'admin'),
  getDriverHistory,
);

router.get(
  '/earnings',
  authenticate,
  requireRole('driver'),
  getDriverEarnings,
);

router.post(
  '/:id/accept',
  authenticate,
  requireRole('driver'),
  acceptDelivery,
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('driver'),
  body('status')
    .isIn(['picked_up', 'delivered'])
    .withMessage("El estado debe ser 'picked_up' o 'delivered'"),
  validate,
  updateDeliveryStatus,
);

export default router;
