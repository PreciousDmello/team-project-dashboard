import { Router } from 'express';
import { body } from 'express-validator';
import { login, refresh, logout, registerUser } from './auth.controller';
import { validateRequest } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/roleGuard';

const router = Router();

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty().trim()],
  validateRequest,
  login
);

router.post('/refresh', refresh);

router.post('/logout', logout);

// Only admins can create new users
router.post(
  '/register',
  authenticate,
  requireRole('ADMIN'),
  [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['ADMIN', 'PM', 'DEVELOPER']),
  ],
  validateRequest,
  registerUser
);

export default router;
