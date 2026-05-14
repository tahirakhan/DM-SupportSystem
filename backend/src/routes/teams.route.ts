import { Router, Request, Response, NextFunction } from 'express';
import { adoService } from '../services/ado.service';

export const teamsRouter = Router();

teamsRouter.get('/teams', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await adoService.getTeams();
    res.json(teams);
  } catch (err) {
    next(err);
  }
});

teamsRouter.get('/teams/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await adoService.getTeams();
    const team = all.find((t) => t.id === req.params.id);
    if (!team) {
      res.status(404).json({ error: 'team not found' });
      return;
    }
    res.json(team);
  } catch (err) {
    next(err);
  }
});
