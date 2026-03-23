import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/roleGuard';
import { listUsers, getUser } from './users.controller';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', listUsers);
router.get('/:id', getUser);

export default router;
