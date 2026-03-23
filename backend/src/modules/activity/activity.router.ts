import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { listActivity, missedActivity, projectActivity } from './activity.controller';

const router = Router();

router.use(authenticate);

router.get('/', listActivity);
router.get('/missed', missedActivity);
router.get('/projects/:projectId', projectActivity);

export default router;
