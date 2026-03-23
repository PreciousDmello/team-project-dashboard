import { Request, Response } from 'express';
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
} from './notifications.service';
import { emitNotificationCount } from '../../sockets';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  try {
    const [notifications, unreadCount] = await Promise.all([
      getUserNotifications(req.user!.userId),
      getUnreadCount(req.user!.userId),
    ]);
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function markRead(req: Request, res: Response): Promise<void> {
  try {
    await markNotificationRead(req.params.id, req.user!.userId);
    await emitNotificationCount(req.user!.userId);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    await markAllRead(req.user!.userId);
    await emitNotificationCount(req.user!.userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}
