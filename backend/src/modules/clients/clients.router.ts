import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/roleGuard';
import { validateRequest } from '../../middleware/validate';
import { listClients, addClient } from './clients.controller';

const router = Router();

router.use(authenticate, requireRole('ADMIN', 'PM'));

router.get('/', listClients);

router.post(
  '/',
  [body('name').notEmpty().trim(), body('contactEmail').optional().isEmail().normalizeEmail()],
  validateRequest,
  addClient
);

export default router;
