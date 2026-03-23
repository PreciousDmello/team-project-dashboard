import prisma from '../../config/prisma';

export async function createNotification(userId: string, taskId: string, message: string) {
  return prisma.notification.create({
    data: { userId, taskId, message },
  });
}

export async function getUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    include: { task: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markNotificationRead(notifId: string, userId: string) {
  const notif = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!notif || notif.userId !== userId) throw { status: 403, message: 'Access denied' };
  return prisma.notification.update({ where: { id: notifId }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
