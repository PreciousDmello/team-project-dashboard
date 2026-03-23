import prisma from '../../config/prisma';

export async function getAllUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true, lastSeenAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) throw { status: 404, message: 'User not found' };
  return user;
}
