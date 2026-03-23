import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error]', err.message);

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    // Never expose stack traces in production
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
}
