import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/prisma';
import { JwtPayload } from '../../middleware/authenticate';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function loginService(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw { status: 401, message: 'Invalid email or password' };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw { status: 401, message: 'Invalid email or password' };

  const payload: JwtPayload = { userId: user.id, role: user.role, email: user.email };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
  });

  const refreshTokenRaw = crypto.randomBytes(48).toString('hex');
  const refreshTokenHash = hashToken(refreshTokenRaw);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshTokenHash, expiresAt },
  });

  // Update lastSeenAt
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function refreshService(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { token: tokenHash } });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw { status: 401, message: 'Invalid or expired refresh token' };
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) throw { status: 401, message: 'User not found' };

  const payload: JwtPayload = { userId: user.id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function logoutService(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { token: tokenHash },
    data: { revoked: true },
  });
}

export async function registerUserService(
  name: string,
  email: string,
  password: string,
  role: 'ADMIN' | 'PM' | 'DEVELOPER'
) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw { status: 409, message: 'Email already in use' };

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return user;
}
