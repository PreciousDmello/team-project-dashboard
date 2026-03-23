import prisma from '../../config/prisma';
import { Role } from '@prisma/client';

export async function getDashboardSummary(userId: string, role: Role) {
  if (role === 'ADMIN') {
    const [totalProjects, totalOverdue, tasksByStatus] = await Promise.all([
      prisma.project.count(),
      prisma.task.count({ where: { isOverdue: true } }),
      prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return {
      scope: 'ADMIN',
      totalProjects,
      totalOverdue,
      tasksByStatus: tasksByStatus.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      }, {}),
    };
  }

  if (role === 'PM') {
    const myProjects = await prisma.project.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    const projectIds = myProjects.map((p) => p.id);

    const [tasksByPriority, upcoming] = await Promise.all([
      prisma.task.groupBy({
        by: ['priority'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: { id: true, title: true, dueDate: true, priority: true, status: true },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
    ]);

    return {
      scope: 'PM',
      totalProjects: projectIds.length,
      tasksByPriority: tasksByPriority.reduce<Record<string, number>>((acc, row) => {
        acc[row.priority] = row._count._all;
        return acc;
      }, {}),
      upcomingDueDates: upcoming,
    };
  }

  const assignedTasks = await prisma.task.findMany({
    where: { assignedToId: userId },
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });

  return {
    scope: 'DEVELOPER',
    assignedTasks,
  };
}
