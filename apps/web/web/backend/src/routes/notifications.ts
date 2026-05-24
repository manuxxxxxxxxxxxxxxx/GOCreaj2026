import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listNotifications,
  markAllRead,
  markRead,
} from '../controllers/notificationController';

const router = Router();

// /read-all must come BEFORE /:id/read to prevent Express from matching
// the literal string 'read-all' as an :id param.

router.get('/', authenticate, listNotifications);

router.patch('/read-all', authenticate, markAllRead);

router.patch('/:id/read', authenticate, markRead);

export default router;
