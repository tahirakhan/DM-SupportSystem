import { Router, Request, Response, NextFunction } from 'express';
import { sprintProgressService } from '../services/sprint-progress.service';

export const sprintProgressRouter = Router();

sprintProgressRouter.get(
  '/dashboards/sprint-progress',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = String(req.query['teamId'] ?? '');
      const sprintId = req.query['sprintId'] ? String(req.query['sprintId']) : undefined;
      const refresh = req.query['refresh'] === '1' || req.query['refresh'] === 'true';

      if (!teamId) {
        res.status(400).json({ error: 'teamId is required' });
        return;
      }

      const data = await sprintProgressService.getSprintProgress(teamId, sprintId, refresh);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);
