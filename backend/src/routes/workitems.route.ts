import { Router, Request, Response, NextFunction } from 'express';
import { adoService } from '../services/ado.service';
import { loadConfig } from '../config/config';

export const workitemsRouter = Router();

workitemsRouter.get('/features', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = loadConfig();
    const areaPath = (req.query['areaPath'] as string) ?? config.defaultAreaPath;
    const iterationPath = (req.query['iterationPath'] as string) ?? config.defaultIterationPath;

    if (!areaPath || !iterationPath) {
      res.status(400).json({ error: true, message: 'areaPath and iterationPath are required' });
      return;
    }

    const features = await adoService.getFeatures(areaPath, iterationPath);
    res.json(features);
  } catch (err) {
    next(err);
  }
});
