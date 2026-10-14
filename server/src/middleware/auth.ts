import { Request, Response, NextFunction } from 'express';
import { UnauthenticatedError } from '../utils/errors.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session || !req.session.userId) {
    throw new UnauthenticatedError('You must be logged in to perform this action');
  }
  next();
}
