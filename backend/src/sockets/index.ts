import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../middleware/authenticate';
import prisma from '../config/prisma';

let io: Server;

// Presence: userId -> socketId
const onlineUsers = new Map<string, string>();

export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Auth middleware — validate access token on socket connect
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication token required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    console.log(`[Socket] Connected: ${user.email} (${user.role})`);

    // Track presence
    onlineUsers.set(user.userId, socket.id);
    broadcastPresence();

    // Admin joins global room
    if (user.role === 'ADMIN') {
      socket.join('admin:global');
    }

    // Join personal room for notifications
    socket.join(`user:${user.userId}`);

    // Join project rooms based on role
    try {
      if (user.role === 'ADMIN') {
        // Admin joins all project rooms
        const projects = await prisma.project.findMany({ select: { id: true } });
        projects.forEach((p) => socket.join(`project:${p.id}`));
      } else if (user.role === 'PM') {
        const projects = await prisma.project.findMany({
          where: { createdById: user.userId },
          select: { id: true },
        });
        projects.forEach((p) => socket.join(`project:${p.id}`));
      } else {
        // Developer — join project rooms of assigned tasks
        const tasks = await prisma.task.findMany({
          where: { assignedToId: user.userId },
          select: { projectId: true },
          distinct: ['projectId'],
        });
        tasks.forEach((t) => socket.join(`project:${t.projectId}`));
      }
    } catch (err) {
      console.error('[Socket] Room join error:', err);
    }

    // Allow clients to join a specific project room on demand
    socket.on('join:project', async (projectId: string) => {
      // Verify access before joining
      try {
        if (user.role === 'DEVELOPER') {
          const task = await prisma.task.findFirst({
            where: { projectId, assignedToId: user.userId },
          });
          if (!task) return;
        } else if (user.role === 'PM') {
          const project = await prisma.project.findFirst({
            where: { id: projectId, createdById: user.userId },
          });
          if (!project) return;
        }
        socket.join(`project:${projectId}`);
      } catch {}
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(user.userId);
      broadcastPresence();
      console.log(`[Socket] Disconnected: ${user.email}`);
    });
  });

  return io;
}

function broadcastPresence() {
  io.to('admin:global').emit('presence:update', { onlineCount: onlineUsers.size });
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export async function emitNotificationCount(userId: string) {
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  getIo().to(`user:${userId}`).emit('notification:count', { unreadCount });
}

export function emitActivityToRecipients(params: {
  projectId: string;
  activity: unknown;
  pmUserId?: string | null;
  developerUserIds?: string[];
}) {
  const recipientRooms = new Set<string>();
  recipientRooms.add('admin:global');
  if (params.pmUserId) {
    recipientRooms.add(`user:${params.pmUserId}`);
  }
  (params.developerUserIds || []).forEach((devId) => recipientRooms.add(`user:${devId}`));

  for (const room of recipientRooms) {
    getIo().to(room).emit('task:updated', params.activity);
  }
}
