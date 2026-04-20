import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import session from 'express-session';
import createError from 'http-errors';

import authRouter from './server/routes/auth';
import usersRouter from './server/routes/users';
import coursesRouter from './server/routes/courses';
import logsRouter from './server/routes/logs';
import { isTenant, TENANTS, Tenant } from './server/types';
import { Role } from './server/types';

const buildApp = (): Express => {
  const app: Express = express();

  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'dev_only_secret_change_me',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
    })
  );

  app.use('/api/v1/:tenant/auth', authRouter);
  app.use('/api/v1/:tenant/users', usersRouter);
  app.use('/api/v1/:tenant/courses', coursesRouter);
  app.use('/api/v1/:tenant/logs', logsRouter);

  const pageGuard = (tenant: Tenant, allowed: Role[]) =>
    (req: Request, res: Response, next: NextFunction): void => {
      const user = req.session.user;
      if (!user) {
        res.redirect(`/${tenant}/login.html`);
        return;
      }
      if (user.tenant !== tenant) {
        const reason = 'Cross-tenant page access blocked';
        console.log(`[SECURITY] ${reason} user=${user.username} url=${req.originalUrl}`);
        req.session.destroy(() => {
          res.redirect(`/${tenant}/login.html`);
        });
        return;
      }
      if (!allowed.includes(user.role)) {
        const reason = `Role '${user.role}' not permitted for ${req.originalUrl}`;
        console.log(`[SECURITY] ${reason}`);
        req.session.destroy(() => {
          res.redirect(`/${tenant}/login.html`);
        });
        return;
      }
      next();
    };

  const publicDir = path.join(process.cwd(), 'public');

  for (const t of TENANTS) {
    app.get(`/${t}/admin.html`, pageGuard(t, ['admin']), (_req, res) => {
      res.sendFile(path.join(publicDir, 'admin.html'));
    });
    app.get(`/${t}/teacher.html`, pageGuard(t, ['teacher']), (_req, res) => {
      res.sendFile(path.join(publicDir, 'teacher.html'));
    });
    app.get(`/${t}/ta.html`, pageGuard(t, ['ta']), (_req, res) => {
      res.sendFile(path.join(publicDir, 'ta.html'));
    });
    app.get(`/${t}/student.html`, pageGuard(t, ['student']), (_req, res) => {
      res.sendFile(path.join(publicDir, 'student.html'));
    });

    app.use(`/${t}`, express.static(publicDir));
  }

  app.use(express.static(publicDir));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(createError(404));
  });

  app.use((err: { status?: number; message: string }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status ?? 500).json({ error: err.message });
  });

  return app;
};

const app = buildApp();

export default app;
export { buildApp };
