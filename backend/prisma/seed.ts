import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear in dependency order
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ────────────────────────────────────────────
  const adminPass = await hash('password123');
  const admin = await prisma.user.create({
    data: { name: 'Alex Admin', email: 'admin@velocity.dev', password: adminPass, role: 'ADMIN' },
  });

  const pm1 = await prisma.user.create({
    data: { name: 'Sara Chen', email: 'pm1@velocity.dev', password: await hash('password123'), role: 'PM' },
  });
  const pm2 = await prisma.user.create({
    data: { name: 'Marcus Webb', email: 'pm2@velocity.dev', password: await hash('password123'), role: 'PM' },
  });

  const dev1 = await prisma.user.create({
    data: { name: 'Ravi Kumar', email: 'dev1@velocity.dev', password: await hash('password123'), role: 'DEVELOPER' },
  });
  const dev2 = await prisma.user.create({
    data: { name: 'Priya Patel', email: 'dev2@velocity.dev', password: await hash('password123'), role: 'DEVELOPER' },
  });
  const dev3 = await prisma.user.create({
    data: { name: 'Luca Romano', email: 'dev3@velocity.dev', password: await hash('password123'), role: 'DEVELOPER' },
  });
  const dev4 = await prisma.user.create({
    data: { name: 'Aisha Okoye', email: 'dev4@velocity.dev', password: await hash('password123'), role: 'DEVELOPER' },
  });

  // ── Clients ──────────────────────────────────────────
  const clientA = await prisma.client.create({
    data: { name: 'TechNova Inc.', contactEmail: 'contact@technova.io', createdById: admin.id },
  });
  const clientB = await prisma.client.create({
    data: { name: 'FinEdge Corp', contactEmail: 'hello@finedge.com', createdById: pm1.id },
  });
  const clientC = await prisma.client.create({
    data: { name: 'HealthSync Ltd', contactEmail: 'ops@healthsync.co', createdById: pm2.id },
  });

  // ── Helper: dates ────────────────────────────────────
  const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

  // ── Project 1: E-Commerce Relaunch (PM: Sara, Client: TechNova) ─────
  const project1 = await prisma.project.create({
    data: { name: 'E-Commerce Relaunch', description: 'Rebuild TechNova storefront', clientId: clientA.id, createdById: pm1.id },
  });

  const tasks1 = await Promise.all([
    prisma.task.create({ data: { title: 'Design homepage mockups', projectId: project1.id, assignedToId: dev1.id, status: 'DONE', priority: 'HIGH', dueDate: daysFromNow(-10), isOverdue: false } }),
    prisma.task.create({ data: { title: 'Implement product catalog API', projectId: project1.id, assignedToId: dev2.id, status: 'IN_PROGRESS', priority: 'CRITICAL', dueDate: daysFromNow(3) } }),
    prisma.task.create({ data: { title: 'Setup payment gateway integration', projectId: project1.id, assignedToId: dev1.id, status: 'IN_REVIEW', priority: 'CRITICAL', dueDate: daysFromNow(5) } }),
    prisma.task.create({ data: { title: 'Write unit tests for cart module', projectId: project1.id, assignedToId: dev2.id, status: 'TODO', priority: 'MEDIUM', dueDate: daysFromNow(8) } }),
    // OVERDUE task #1
    prisma.task.create({ data: { title: 'Optimize image CDN pipeline', projectId: project1.id, assignedToId: dev3.id, status: 'OVERDUE', priority: 'HIGH', dueDate: daysFromNow(-5), isOverdue: true } }),
    // OVERDUE task #2
    prisma.task.create({ data: { title: 'Setup staging environment CI/CD', projectId: project1.id, assignedToId: dev4.id, status: 'OVERDUE', priority: 'MEDIUM', dueDate: daysFromNow(-3), isOverdue: true } }),
  ]);

  // ── Project 2: Trading Dashboard (PM: Sara, Client: FinEdge) ─────────
  const project2 = await prisma.project.create({
    data: { name: 'Trading Dashboard v2', description: 'Real-time financial dashboard', clientId: clientB.id, createdById: pm1.id },
  });

  const tasks2 = await Promise.all([
    prisma.task.create({ data: { title: 'WebSocket market feed integration', projectId: project2.id, assignedToId: dev1.id, status: 'IN_PROGRESS', priority: 'CRITICAL', dueDate: daysFromNow(4) } }),
    prisma.task.create({ data: { title: 'Portfolio P&L calculator', projectId: project2.id, assignedToId: dev2.id, status: 'TODO', priority: 'HIGH', dueDate: daysFromNow(6) } }),
    prisma.task.create({ data: { title: 'Chart library evaluation', projectId: project2.id, assignedToId: dev3.id, status: 'DONE', priority: 'LOW', dueDate: daysFromNow(-15) } }),
    prisma.task.create({ data: { title: 'User alert notification system', projectId: project2.id, assignedToId: dev4.id, status: 'IN_REVIEW', priority: 'HIGH', dueDate: daysFromNow(2) } }),
    prisma.task.create({ data: { title: 'DB schema for historical prices', projectId: project2.id, assignedToId: dev1.id, status: 'DONE', priority: 'MEDIUM', dueDate: daysFromNow(-20) } }),
    prisma.task.create({ data: { title: 'Trade execution audit log', projectId: project2.id, assignedToId: dev2.id, status: 'TODO', priority: 'CRITICAL', dueDate: daysFromNow(10) } }),
  ]);

  // ── Project 3: Patient Portal (PM: Marcus, Client: HealthSync) ───────
  const project3 = await prisma.project.create({
    data: { name: 'Patient Portal', description: 'Secure health data management portal', clientId: clientC.id, createdById: pm2.id },
  });

  const tasks3 = await Promise.all([
    prisma.task.create({ data: { title: 'HIPAA compliance audit prep', projectId: project3.id, assignedToId: dev3.id, status: 'IN_PROGRESS', priority: 'CRITICAL', dueDate: daysFromNow(1) } }),
    prisma.task.create({ data: { title: 'Patient record encryption layer', projectId: project3.id, assignedToId: dev4.id, status: 'IN_REVIEW', priority: 'CRITICAL', dueDate: daysFromNow(2) } }),
    prisma.task.create({ data: { title: 'Appointment scheduling module', projectId: project3.id, assignedToId: dev3.id, status: 'TODO', priority: 'HIGH', dueDate: daysFromNow(7) } }),
    prisma.task.create({ data: { title: 'Doctor dashboard UI', projectId: project3.id, assignedToId: dev4.id, status: 'TODO', priority: 'MEDIUM', dueDate: daysFromNow(9) } }),
    prisma.task.create({ data: { title: 'Lab results PDF export', projectId: project3.id, assignedToId: dev3.id, status: 'TODO', priority: 'LOW', dueDate: daysFromNow(14) } }),
  ]);

  // ── Activity Logs ─────────────────────────────────────
  const allTasks = [...tasks1, ...tasks2, ...tasks3];
  const allUsers = [admin, pm1, pm2, dev1, dev2, dev3, dev4];

  // Seed realistic activity entries for each project
  const activityData = [
    { task: tasks1[0], project: project1, user: dev1, from: 'TODO' as TaskStatus, to: 'IN_PROGRESS' as TaskStatus, hoursAgo: 48 },
    { task: tasks1[0], project: project1, user: dev1, from: 'IN_PROGRESS' as TaskStatus, to: 'IN_REVIEW' as TaskStatus, hoursAgo: 36 },
    { task: tasks1[0], project: project1, user: pm1, from: 'IN_REVIEW' as TaskStatus, to: 'DONE' as TaskStatus, hoursAgo: 24 },
    { task: tasks1[2], project: project1, user: dev1, from: 'TODO' as TaskStatus, to: 'IN_PROGRESS' as TaskStatus, hoursAgo: 30 },
    { task: tasks1[2], project: project1, user: dev1, from: 'IN_PROGRESS' as TaskStatus, to: 'IN_REVIEW' as TaskStatus, hoursAgo: 12 },
    { task: tasks1[1], project: project1, user: dev2, from: 'TODO' as TaskStatus, to: 'IN_PROGRESS' as TaskStatus, hoursAgo: 20 },
    { task: tasks2[4], project: project2, user: dev1, from: 'TODO' as TaskStatus, to: 'DONE' as TaskStatus, hoursAgo: 72 },
    { task: tasks2[2], project: project2, user: dev3, from: 'IN_PROGRESS' as TaskStatus, to: 'DONE' as TaskStatus, hoursAgo: 60 },
    { task: tasks2[3], project: project2, user: dev4, from: 'TODO' as TaskStatus, to: 'IN_REVIEW' as TaskStatus, hoursAgo: 10 },
    { task: tasks3[1], project: project3, user: dev4, from: 'IN_PROGRESS' as TaskStatus, to: 'IN_REVIEW' as TaskStatus, hoursAgo: 8 },
    { task: tasks3[0], project: project3, user: dev3, from: 'TODO' as TaskStatus, to: 'IN_PROGRESS' as TaskStatus, hoursAgo: 16 },
  ];

  for (const entry of activityData) {
    const createdAt = new Date(Date.now() - entry.hoursAgo * 3600 * 1000);
    await prisma.activityLog.create({
      data: {
        taskId: entry.task.id,
        projectId: entry.project.id,
        userId: entry.user.id,
        fromStatus: entry.from,
        toStatus: entry.to,
        message: `Task "${entry.task.title}" moved from ${entry.from.replace('_', ' ')} → ${entry.to.replace('_', ' ')}`,
        createdAt,
      },
    });
  }

  // Creation logs for overdue tasks
  await prisma.activityLog.create({
    data: {
      taskId: tasks1[4].id,
      projectId: project1.id,
      userId: pm1.id,
      message: `Task "${tasks1[4].title}" was marked OVERDUE`,
      createdAt: new Date(Date.now() - 5 * 86_400_000),
    },
  });
  await prisma.activityLog.create({
    data: {
      taskId: tasks1[5].id,
      projectId: project1.id,
      userId: pm1.id,
      message: `Task "${tasks1[5].title}" was marked OVERDUE`,
      createdAt: new Date(Date.now() - 3 * 86_400_000),
    },
  });

  // ── Notifications ─────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: dev1.id, taskId: tasks1[2].id, message: 'Task "Setup payment gateway integration" is assigned to you', isRead: false },
      { userId: dev2.id, taskId: tasks1[3].id, message: 'Task "Write unit tests for cart module" is assigned to you', isRead: false },
      { userId: pm1.id, taskId: tasks2[3].id, message: 'Task "User alert notification system" is ready for review', isRead: false },
      { userId: pm2.id, taskId: tasks3[1].id, message: 'Task "Patient record encryption layer" is ready for review', isRead: true },
      { userId: dev3.id, taskId: tasks1[4].id, message: 'Task "Optimize image CDN pipeline" is now OVERDUE', isRead: false },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('\n📋 Login credentials (all use password: password123):');
  console.log('  Admin:  admin@velocity.dev');
  console.log('  PM 1:   pm1@velocity.dev   (Sara Chen)');
  console.log('  PM 2:   pm2@velocity.dev   (Marcus Webb)');
  console.log('  Dev 1:  dev1@velocity.dev  (Ravi Kumar)');
  console.log('  Dev 2:  dev2@velocity.dev  (Priya Patel)');
  console.log('  Dev 3:  dev3@velocity.dev  (Luca Romano)');
  console.log('  Dev 4:  dev4@velocity.dev  (Aisha Okoye)');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
