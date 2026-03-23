import prisma from '../../config/prisma';
import { Role } from '@prisma/client';

export async function createProject(
  name: string,
  description: string | undefined,
  clientId: string,
  createdById: string
) {
  return prisma.project.create({
    data: { name, description, clientId, createdById },
    include: { client: true, createdBy: { select: { id: true, name: true } } },
  });
}

export async function getProjects(userId: string, role: Role) {
  const where =
    role === 'ADMIN'
      ? {}
      : role === 'PM'
      ? { createdById: userId }
      : { tasks: { some: { assignedToId: userId } } };

  return prisma.project.findMany({
    where,
    include: {
      client: true,
      createdBy: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProjectById(projectId: string, userId: string, role: Role) {
  const taskWhere =
    role === 'DEVELOPER'
      ? {
          assignedToId: userId,
        }
      : undefined;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      createdBy: { select: { id: true, name: true } },
      tasks: {
        where: taskWhere,
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!project) throw { status: 404, message: 'Project not found' };
  if (role === 'PM' && project.createdById !== userId)
    throw { status: 403, message: 'Access denied to this project' };
  if (role === 'DEVELOPER') {
    const hasTasks = project.tasks.some((t) => t.assignedToId === userId);
    if (!hasTasks) throw { status: 403, message: 'Access denied to this project' };
  }
  return project;
}

export async function updateProject(
  projectId: string,
  userId: string,
  role: Role,
  data: { name?: string; description?: string; status?: string }
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw { status: 404, message: 'Project not found' };
  if (role === 'PM' && project.createdById !== userId)
    throw { status: 403, message: 'You can only edit your own projects' };
  return prisma.project.update({ where: { id: projectId }, data });
}

export async function deleteProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw { status: 404, message: 'Project not found' };
  return prisma.project.delete({ where: { id: projectId } });
}
