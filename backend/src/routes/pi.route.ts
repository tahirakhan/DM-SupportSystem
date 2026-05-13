import { Router, Request, Response, NextFunction } from 'express';
import { adoService } from '../services/ado.service';

export const piRouter = Router();

piRouter.get('/pi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { areaPath, iterationPath } = req.query as { areaPath: string; iterationPath: string };
    if (!areaPath || !iterationPath) {
      res.status(400).json({ error: 'areaPath and iterationPath are required' });
      return;
    }
    const data = await adoService.getPiData(areaPath, iterationPath);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
