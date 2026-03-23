import prisma from '../../config/prisma';
import { Role, TaskStatus, Priority } from '@prisma/client';
import { emitActivityToRecipients, emitNotificationCount, getIo } from '../../sockets';
import { createNotification } from '../notifications/notifications.service';

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  dueAfter?: string;
  dueBefore?: string;
}

export async function getTasksByProject(
  projectId: string,
  userId: string,
  role: Role,
  filters: TaskFilters
) {
  // PM: verify owns project
  if (role === 'PM') {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.createdById !== userId)
      throw { status: 403, message: 'Access denied to this project' };
  }
  if (role === 'DEVELOPER') {
    const projectTask = await prisma.task.findFirst({
      where: { projectId, assignedToId: userId },
      select: { id: true },
    });
    if (!projectTask) throw { status: 403, message: 'Access denied to this project' };
  }

  const where: any = { projectId };
  if (role === 'DEVELOPER') where.assignedToId = userId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.dueAfter || filters.dueBefore) {
    where.dueDate = {};
    if (filters.dueAfter) where.dueDate.gte = new Date(filters.dueAfter);
    if (filters.dueBefore) where.dueDate.lte = new Date(filters.dueBefore);
  }

  return prisma.task.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });
}

export async function getTaskById(taskId: string, userId: string, role: Role) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedTo: { select: { id: true, name: true } },
      activityLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!task) throw { status: 404, message: 'Task not found' };
  if (role === 'DEVELOPER' && task.assignedToId !== userId)
    throw { status: 403, message: 'Access denied to this task' };
  if (role === 'PM') {
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      select: { createdById: true },
    });
    if (!project || project.createdById !== userId)
      throw { status: 403, message: 'Access denied to this task' };
  }
  return task;
}

export async function createTask(
  projectId: string,
  userId: string,
  role: Role,
  data: {
    title: string;
    description?: string;
    assignedToId?: string;
    priority?: Priority;
    dueDate?: string;
  }
) {
  if (role === 'PM') {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.createdById !== userId)
      throw { status: 403, message: 'Access denied to this project' };
  }

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      projectId,
      assignedToId: data.assignedToId,
      priority: data.priority || 'MEDIUM',
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  // Activity log for creation
  const actLog = await prisma.activityLog.create({
    data: {
      taskId: task.id,
      projectId,
      userId,
      message: `Task "${task.title}" was created`,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Notification: task assigned
  if (data.assignedToId) {
    await createNotification(data.assignedToId, task.id, `You have been assigned task "${task.title}"`);
    getIo().to(`user:${data.assignedToId}`).emit('notification:new', {
      message: `You have been assigned task "${task.title}"`,
    });
    await emitNotificationCount(data.assignedToId);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdById: true },
  });
  emitActivityToRecipients({
    projectId,
    activity: { ...actLog, task },
    pmUserId: project?.createdById,
    developerUserIds: data.assignedToId ? [data.assignedToId] : [],
  });

  return task;
}

export async function updateTask(
  taskId: string,
  userId: string,
  role: Role,
  data: {
    title?: string;
    description?: string;
    assignedToId?: string;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: string;
  }
) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!existing) throw { status: 404, message: 'Task not found' };

  // Developer can only update status on their own task
  if (role === 'DEVELOPER') {
    if (existing.assignedToId !== userId)
      throw { status: 403, message: 'Access denied to this task' };
    const allowed = ['status'] as const;
    const forbidden = Object.keys(data).filter((k) => !allowed.includes(k as any));
    if (forbidden.length > 0)
      throw { status: 403, message: 'Developers can only update task status' };
  }
  // PM can only edit tasks in own projects
  if (role === 'PM' && existing.project.createdById !== userId)
    throw { status: 403, message: 'Access denied to this project' };

  const fromStatus = existing.status;
  const toStatus = data.status;

  const updatedTask = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        // Reset overdue if manually moved to DONE
        ...(data.status === 'DONE' ? { isOverdue: false } : {}),
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    // Record activity log if status changed
    if (toStatus && toStatus !== fromStatus) {
      await tx.activityLog.create({
        data: {
          taskId,
          projectId: existing.projectId,
          userId,
          fromStatus,
          toStatus,
          message: `Task "${existing.title}" moved from ${fromStatus.replace('_', ' ')} → ${toStatus.replace('_', ' ')}`,
        },
      });
    }

    return updated;
  });

  // Emit real-time event
  const actLog = await prisma.activityLog.findFirst({
    where: { taskId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (actLog) {
    const developerRecipients = [existing.assignedToId, updatedTask.assignedToId].filter(
      (id): id is string => Boolean(id)
    );
    emitActivityToRecipients({
      projectId: existing.projectId,
      activity: { ...actLog, task: updatedTask },
      pmUserId: existing.project.createdById,
      developerUserIds: developerRecipients,
    });

    // Notify developer of status change to IN_REVIEW → notify PM
    if (toStatus === 'IN_REVIEW' && existing.project.createdById) {
      const pmId = existing.project.createdById;
      await createNotification(pmId, taskId, `Task "${existing.title}" is ready for review`);
      getIo().to(`user:${pmId}`).emit('notification:new', {
        message: `Task "${existing.title}" is ready for review`,
      });
      await emitNotificationCount(pmId);
    }
  }

  return updatedTask;
}
