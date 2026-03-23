import cron from 'node-cron';
import prisma from '../config/prisma';
import { getIo } from '../sockets';

export function startOverdueJob() {
  // Runs every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Job] Checking for overdue tasks...');
    try {
      const now = new Date();
      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: { lt: now },
          isOverdue: false,
          status: { notIn: ['DONE', 'OVERDUE'] },
        },
        select: { id: true, title: true, projectId: true },
      });

      if (overdueTasks.length === 0) {
        console.log('[Job] No new overdue tasks.');
        return;
      }

      // Batch update
      await prisma.task.updateMany({
        where: { id: { in: overdueTasks.map((t) => t.id) } },
        data: { isOverdue: true, status: 'OVERDUE' },
      });

      console.log(`[Job] Marked ${overdueTasks.length} task(s) as overdue.`);

      // Emit per-project events
      const io = getIo();
      for (const task of overdueTasks) {
        io.to(`project:${task.projectId}`)
          .to('admin:global')
          .emit('task:overdue', { taskId: task.id, title: task.title, projectId: task.projectId });
      }
    } catch (err) {
      console.error('[Job] Overdue check failed:', err);
    }
  });

  console.log('[Job] Overdue task scheduler started (every 15 minutes)');
}
