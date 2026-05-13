import { Router, Request, Response, NextFunction } from 'express';
import { adoService } from '../services/ado.service';
import { loadConfig } from '../config/config';

export const iterationsRouter = Router();

iterationsRouter.get('/areas', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const paths = await adoService.getAreaPaths();
    res.json(paths);
  } catch (err) {
    next(err);
  }
});

iterationsRouter.get('/iterations', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const paths = await adoService.getIterationPaths();
    res.json(paths);
  } catch (err) {
    next(err);
  }
});

iterationsRouter.get('/pi-iterations', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const paths = await adoService.getPiIterationPaths();
    res.json(paths);
  } catch (err) {
    next(err);
  }
});

iterationsRouter.get('/config', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = loadConfig();
    res.json({
      defaultAreaPath: config.defaultAreaPath,
      defaultIterationPath: config.defaultIterationPath,
      iterationPaths: config.iterationPaths,
      areaPaths: config.areaPaths,
    });
  } catch (err) {
    next(err);
  }
});
