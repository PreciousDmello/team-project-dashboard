import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/roleGuard';
import { validateRequest } from '../../middleware/validate';
import { listTasks, addTask, editTask, getTask } from './tasks.controller';

// This router is mounted at /api/projects/:projectId/tasks (mergeParams: true)
const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', listTasks);

router.post(
  '/',
  requireRole('ADMIN', 'PM'),
  [
    body('title').notEmpty().trim(),
    body('description').optional().trim(),
    body('assignedToId').optional().isUUID(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    body('dueDate').optional().isISO8601(),
  ],
  validateRequest,
  addTask
);

// Standalone task update/get (mounted separately at /api/tasks/:id)
export const standaloneTaskRouter = Router();
standaloneTaskRouter.use(authenticate);
standaloneTaskRouter.get('/:id', getTask);
standaloneTaskRouter.put('/:id', [
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  body('dueDate').optional().isISO8601(),
], validateRequest, editTask);

export default router;
