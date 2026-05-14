import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
} from '../controllers/messagesController';

const router = Router();

router.use(authenticate());

router.get('/conversations',        getConversations);
router.get('/unread',               getUnreadCount);
router.get('/:partnerId',           getMessages);
router.post('/',                    sendMessage);
router.patch('/:partnerId/read',    markAsRead);

export default router;
