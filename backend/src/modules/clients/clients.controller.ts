import { Request, Response } from 'express';
import { createClient, getAllClients } from './clients.service';

export async function listClients(req: Request, res: Response): Promise<void> {
  try {
    const clients = await getAllClients();
    res.json({ success: true, data: clients });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function addClient(req: Request, res: Response): Promise<void> {
  try {
    const { name, contactEmail } = req.body;
    const client = await createClient(name, contactEmail, req.user!.userId);
    res.status(201).json({ success: true, data: client });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}
