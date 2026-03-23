import { Request, Response } from 'express';
import { getTasksByProject, getTaskById, createTask, updateTask } from './tasks.service';
import { TaskStatus, Priority } from '@prisma/client';

export async function listTasks(req: Request, res: Response): Promise<void> {
  try {
    const { status, priority, dueAfter, dueBefore } = req.query;
    const tasks = await getTasksByProject(req.params.projectId, req.user!.userId, req.user!.role, {
      status: status as TaskStatus | undefined,
      priority: priority as Priority | undefined,
      dueAfter: dueAfter as string | undefined,
      dueBefore: dueBefore as string | undefined,
    });
    res.json({ success: true, data: tasks });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function getTask(req: Request, res: Response): Promise<void> {
  try {
    const task = await getTaskById(req.params.id, req.user!.userId, req.user!.role);
    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function addTask(req: Request, res: Response): Promise<void> {
  try {
    const task = await createTask(req.params.projectId, req.user!.userId, req.user!.role, req.body);
    res.status(201).json({ success: true, data: task });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function editTask(req: Request, res: Response): Promise<void> {
  try {
    const task = await updateTask(req.params.id, req.user!.userId, req.user!.role, req.body);
    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}
