import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createOrder,
  getMyOrders,
  getSellerOrders,
  getOrder,
  updateOrderStatus,
} from '../controllers/orderController';

const router = Router();

/* ── Validators ───────────────────────────────────────────── */
const createOrderValidators = [
  body('seller_id')
    .isUUID()
    .withMessage('seller_id debe ser un UUID válido'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un producto'),
  body('items.*.product_id')
    .isUUID()
    .withMessage('product_id debe ser un UUID válido'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser al menos 1'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('La dirección es requerida'),
  body('notes')
    .optional()
    .trim(),
];

/* ── Routes ───────────────────────────────────────────────── */
router.post(
  '/',
  authenticate,
  requireRole('buyer'),
  createOrderValidators,
  validate,
  createOrder,
);

router.get(
  '/my',
  authenticate,
  requireRole('buyer', 'admin', 'master_admin'),
  getMyOrders,
);

router.get(
  '/seller',
  authenticate,
  requireRole('seller', 'admin', 'master_admin'),
  getSellerOrders,
);

router.get(
  '/:id',
  authenticate,
  getOrder,
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('seller', 'driver', 'admin', 'master_admin'),
  body('status').notEmpty().withMessage('El estado es requerido'),
  validate,
  updateOrderStatus,
);

export default router;
