import { Request, Response } from 'express';
import { getActivity, getMissedActivity, getProjectActivity } from './activity.service';

export async function listActivity(req: Request, res: Response): Promise<void> {
  try {
    const activity = await getActivity(req.user!.userId, req.user!.role);
    res.json({ success: true, data: activity });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function missedActivity(req: Request, res: Response): Promise<void> {
  try {
    const { since } = req.query;
    if (!since || typeof since !== 'string') {
      res.status(400).json({ success: false, message: 'since query param required (ISO date)' });
      return;
    }
    const logs = await getMissedActivity(req.user!.userId, req.user!.role, since);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function projectActivity(req: Request, res: Response): Promise<void> {
  try {
    const logs = await getProjectActivity(req.params.projectId, req.user!.userId, req.user!.role);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}
