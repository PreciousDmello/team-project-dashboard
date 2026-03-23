import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { errorHandler } from './middleware/errorHandler';
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import clientsRouter from './modules/clients/clients.router';
import projectsRouter from './modules/projects/projects.router';
import { standaloneTaskRouter } from './modules/tasks/tasks.router';
import activityRouter from './modules/activity/activity.router';
import notificationsRouter from './modules/notifications/notifications.router';
import dashboardsRouter from './modules/dashboards/dashboards.router';
import { initSocket } from './sockets';
import { startOverdueJob } from './jobs/overdueTask.job';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io (must be done before routes that use getIo())
initSocket(server);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', standaloneTaskRouter);
app.use('/api/activity', activityRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/dashboards', dashboardsRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Start background job
startOverdueJob();

const PORT = parseInt(process.env.PORT || '3001', 10);
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export { app, server };
