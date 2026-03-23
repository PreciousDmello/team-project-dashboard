import { Request, Response } from 'express';
import { getDashboardSummary } from './dashboards.service';

export async function summary(req: Request, res: Response): Promise<void> {
  try {
    const data = await getDashboardSummary(req.user!.userId, req.user!.role);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}
