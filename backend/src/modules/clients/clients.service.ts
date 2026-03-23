import prisma from '../../config/prisma';

export async function createClient(name: string, contactEmail: string | undefined, createdById: string) {
  return prisma.client.create({
    data: { name, contactEmail, createdById },
  });
}

export async function getAllClients() {
  return prisma.client.findMany({ orderBy: { name: 'asc' } });
}
