import { Request, Response } from 'express';
import { getAllUsers, getUserById } from './users.service';

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await getAllUsers();
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const user = await getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}
