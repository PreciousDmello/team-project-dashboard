import { Request, Response } from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from './projects.service';

export async function listProjects(req: Request, res: Response): Promise<void> {
  try {
    const projects = await getProjects(req.user!.userId, req.user!.role);
    res.json({ success: true, data: projects });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
  try {
    const project = await getProjectById(req.params.id, req.user!.userId, req.user!.role);
    res.json({ success: true, data: project });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function addProject(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, clientId } = req.body;
    const project = await createProject(name, description, clientId, req.user!.userId);
    res.status(201).json({ success: true, data: project });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function editProject(req: Request, res: Response): Promise<void> {
  try {
    const project = await updateProject(req.params.id, req.user!.userId, req.user!.role, req.body);
    res.json({ success: true, data: project });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function removeProject(req: Request, res: Response): Promise<void> {
  try {
    await deleteProject(req.params.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}
