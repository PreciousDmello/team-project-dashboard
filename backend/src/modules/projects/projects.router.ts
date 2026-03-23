import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/roleGuard';
import { validateRequest } from '../../middleware/validate';
import {
  listProjects,
  getProject,
  addProject,
  editProject,
  removeProject,
} from './projects.controller';
import tasksRouter from '../tasks/tasks.router';

const router = Router();

router.use(authenticate);

router.get('/', listProjects);
router.get('/:id', getProject);

router.post(
  '/',
  requireRole('ADMIN', 'PM'),
  [
    body('name').notEmpty().trim(),
    body('clientId').notEmpty().isUUID(),
    body('description').optional().trim(),
  ],
  validateRequest,
  addProject
);

router.put('/:id', requireRole('ADMIN', 'PM'), editProject);

router.delete('/:id', requireRole('ADMIN'), removeProject);

// Nest tasks under projects
router.use('/:projectId/tasks', tasksRouter);

export default router;
