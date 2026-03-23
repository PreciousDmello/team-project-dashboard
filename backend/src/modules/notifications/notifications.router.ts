import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { listNotifications, markRead, markAllAsRead } from './notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markRead);

export default router;
