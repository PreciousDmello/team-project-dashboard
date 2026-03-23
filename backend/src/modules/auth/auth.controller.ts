import { Request, Response } from 'express';
import { loginService, refreshService, logoutService, registerUserService } from './auth.service';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) {
      res.status(401).json({ success: false, message: 'No refresh token provided' });
      return;
    }
    const result = await refreshService(rawToken);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) await logoutService(rawToken);
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

export async function registerUser(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, role } = req.body;
    const user = await registerUserService(name, email, password, role);
    res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}
