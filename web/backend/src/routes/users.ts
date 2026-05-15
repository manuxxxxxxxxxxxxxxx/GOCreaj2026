import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listUsers,
  getUser,
  updateStatus,
  updateRole,
  deleteUser,
  getMe,
  updateMe,
} from '../controllers/userController';

const router = Router();

// /me routes must come BEFORE /:id to avoid Express treating 'me' as an id param.

router.get('/me', authenticate, getMe);

router.patch('/me', authenticate, updateMe);

router.get('/', authenticate, requireRole('admin', 'master_admin'), listUsers);

router.get('/:id', authenticate, requireRole('admin', 'master_admin'), getUser);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin', 'master_admin'),
  body('status').isIn(['verified', 'suspended', 'banned']).withMessage('status must be verified, suspended, or banned'),
  validate,
  updateStatus
);

router.patch(
  '/:id/role',
  authenticate,
  requireRole('admin', 'master_admin'),
  body('role').isIn(['buyer', 'seller', 'driver', 'admin']).withMessage('role must be buyer, seller, driver, or admin'),
  validate,
  updateRole
);

router.delete('/:id', authenticate, requireRole('admin', 'master_admin'), deleteUser);

export default router;
