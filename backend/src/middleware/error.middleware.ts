import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (axios.isAxiosError(err) && err.response) {
    const body = err.response.data as any;
    const adoMessage =
      body?.message ||
      body?.value?.Message ||
      body?.errorCode ||
      err.message;
    console.error('[ADO ERROR]', err.response.status, JSON.stringify(body));
    res.status(err.response.status).json({
      error: true,
      message: `ADO API error: ${adoMessage}`,
      detail: body,
    });
  } else {
    console.error('[ERROR]', err.message);
    const status = (err as any).status ?? 500;
    res.status(status).json({
      error: true,
      message: err.message ?? 'Internal server error',
    });
  }
}
