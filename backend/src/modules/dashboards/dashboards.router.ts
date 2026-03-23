import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { summary } from './dashboards.controller';

const router = Router();

router.use(authenticate);
router.get('/summary', summary);

export default router;
