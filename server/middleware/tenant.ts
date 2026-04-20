import { Request, Response, NextFunction } from 'express';
import { isTenant, Tenant } from '../types';

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: Tenant;
  }
}

const tenantFromParam = (req: Request, res: Response, next: NextFunction): void => {
  const raw = req.params.tenant;
  if (!isTenant(raw)) {
    res.status(400).json({ error: 'Invalid tenant' });
    return;
  }
  req.tenant = raw;
  next();
};

export { tenantFromParam };
