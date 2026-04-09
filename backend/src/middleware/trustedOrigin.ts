import type { NextFunction, Request, Response } from 'express';
import { isAllowedRequestOrigin } from '../lib/originPolicy';
import { runtimeConfig } from '../config/runtime';

export const requireTrustedOrigin = (req: Request, res: Response, next: NextFunction) => {
  if (isAllowedRequestOrigin(req, runtimeConfig.nodeEnv)) {
    next();
    return;
  }

  res.status(403).json({ error: 'Cross-site request blocked' });
};
