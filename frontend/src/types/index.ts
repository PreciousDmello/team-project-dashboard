export type Role = 'ADMIN' | 'PM' | 'DEVELOPER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'OVERDUE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastSeenAt?: string;
  createdAt?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
  contactEmail?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  clientId: string;
  createdById: string;
  createdAt: string;
  client?: Client;
  createdBy?: { id: string; name: string };
  _count?: { tasks: number };
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  assignedToId?: string;
  assignedTo?: { id: string; name: string };
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  activityLogs?: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  taskId?: string;
  projectId: string;
  userId: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  message: string;
  createdAt: string;
  user: { id: string; name: string };
  task?: { id: string; title: string };
  project?: { id: string; name: string };
}

export interface Notification {
  id: string;
  userId: string;
  taskId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  task?: { id: string; title: string };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
