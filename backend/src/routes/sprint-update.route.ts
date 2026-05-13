import { Router, Request, Response, NextFunction } from 'express';
import { adoService } from '../services/ado.service';

export const sprintUpdateRouter = Router();

sprintUpdateRouter.get('/sprint-update', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const areaPath = req.query['areaPath'] as string;
    const iterationPath = req.query['iterationPath'] as string;

    if (!areaPath || !iterationPath) {
      res.status(400).json({ error: 'areaPath and iterationPath are required' });
      return;
    }

    const data = await adoService.getSprintUpdateData(areaPath, iterationPath);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
