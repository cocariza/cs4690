import { Request, Response, NextFunction } from 'express';
import { Role, Tenant } from '../types';

interface SessionUser {
  userId: string;
  username: string;
  role: Role;
  tenant: Tenant;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

const wantsJson = (req: Request): boolean => {
  const accept = req.headers.accept ?? '';
  return req.xhr || accept.includes('application/json') || req.originalUrl.startsWith('/api/');
};

const loginUrl = (tenant: Tenant | undefined): string =>
  `/${tenant ?? 'uvu'}/login.html`;

const destroyAndRedirect = (
  req: Request,
  res: Response,
  reason: string,
  tenantForRedirect?: Tenant
): void => {
  const tenant = tenantForRedirect ?? req.tenant ?? req.session.user?.tenant ?? 'uvu';
  console.log(`[SECURITY] ${reason} user=${req.session.user?.username ?? 'anon'} url=${req.originalUrl}`);
  req.session.destroy(() => {
    if (wantsJson(req)) {
      res.status(401).json({ error: reason, redirect: loginUrl(tenant) });
      return;
    }
    res.redirect(loginUrl(tenant));
  });
};

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user) {
    if (wantsJson(req)) {
      res.status(401).json({ error: 'Not authenticated', redirect: loginUrl(req.tenant) });
      return;
    }
    res.redirect(loginUrl(req.tenant));
    return;
  }
  next();
};

const requireSameTenant = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.session.user;
  if (!user) {
    requireAuth(req, res, next);
    return;
  }
  if (req.tenant && user.tenant !== req.tenant) {
    destroyAndRedirect(req, res, 'Cross-tenant access blocked', req.tenant);
    return;
  }
  next();
};

const requireRole = (...allowed: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = req.session.user;
    if (!user) {
      requireAuth(req, res, next);
      return;
    }
    if (req.tenant && user.tenant !== req.tenant) {
      destroyAndRedirect(req, res, 'Cross-tenant access blocked', req.tenant);
      return;
    }
    if (!allowed.includes(user.role)) {
      destroyAndRedirect(req, res, `Role '${user.role}' not permitted for ${req.originalUrl}`);
      return;
    }
    next();
  };

export { SessionUser, requireAuth, requireRole, requireSameTenant, destroyAndRedirect };
