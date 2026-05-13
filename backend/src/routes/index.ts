import { Router, Request, Response } from 'express';
import { workitemsRouter } from './workitems.route';
import { iterationsRouter } from './iterations.route';
import { sprintUpdateRouter } from './sprint-update.route';

export const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use(workitemsRouter);
router.use(iterationsRouter);
router.use(sprintUpdateRouter);
