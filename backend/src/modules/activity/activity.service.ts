import prisma from '../../config/prisma';
import { Role } from '@prisma/client';

export async function getActivity(userId: string, role: Role, limit = 50) {
  let where: any = {};

  if (role === 'PM') {
    // Only activity from projects the PM created
    const myProjects = await prisma.project.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    where.projectId = { in: myProjects.map((p) => p.id) };
  } else if (role === 'DEVELOPER') {
    // Only activity on tasks assigned to this dev
    const myTasks = await prisma.task.findMany({
      where: { assignedToId: userId },
      select: { id: true },
    });
    where.taskId = { in: myTasks.map((t) => t.id) };
  }

  return prisma.activityLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getMissedActivity(userId: string, role: Role, since: string) {
  const sinceDate = new Date(since);
  let where: any = { createdAt: { gt: sinceDate } };

  if (role === 'PM') {
    const myProjects = await prisma.project.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    where.projectId = { in: myProjects.map((p) => p.id) };
  } else if (role === 'DEVELOPER') {
    const myTasks = await prisma.task.findMany({
      where: { assignedToId: userId },
      select: { id: true },
    });
    where.taskId = { in: myTasks.map((t) => t.id) };
  }

  return prisma.activityLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function getProjectActivity(projectId: string, userId: string, role: Role) {
  if (role === 'PM') {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.createdById !== userId)
      throw { status: 403, message: 'Access denied to this project' };
  }
  if (role === 'DEVELOPER') {
    const assignedInProject = await prisma.task.findFirst({
      where: { projectId, assignedToId: userId },
      select: { id: true },
    });
    if (!assignedInProject) throw { status: 403, message: 'Access denied to this project' };
  }

  return prisma.activityLog.findMany({
    where:
      role === 'DEVELOPER'
        ? {
            projectId,
            task: { assignedToId: userId },
          }
        : { projectId },
    include: {
      user: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
