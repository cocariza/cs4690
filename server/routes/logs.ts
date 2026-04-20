import express, { Request, Response, NextFunction } from 'express';
import { Repository } from '../db/Repository';
import { Log, LogModel } from '../models/Log';
import { Course, CourseModel } from '../models/Course';
import { User, UserModel } from '../models/User';
import { tenantFromParam } from '../middleware/tenant';
import { requireSameTenant, destroyAndRedirect } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

router.use(tenantFromParam);

router.get(
  '/',
  requireSameTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.session.user;
      if (!actor) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const logRepo = new Repository<Log>(LogModel);
      const courseRepo = new Repository<Course>(CourseModel);
      const userRepo = new Repository<User>(UserModel);

      const filters = new Map<string, unknown>();
      filters.set('tenant', req.tenant);
      const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : null;
      const uvuId = typeof req.query.uvuId === 'string' ? req.query.uvuId : null;
      if (courseId) filters.set('courseId', courseId);
      if (uvuId) filters.set('uvuId', uvuId);

      const allLogs = await logRepo.get(filters);

      if (actor.role === 'admin') {
        res.json(allLogs);
        return;
      }

      if (actor.role === 'student') {
        const me = await userRepo.findOne({ username: actor.username, tenant: req.tenant });
        if (!me) {
          destroyAndRedirect(req, res, 'User no longer exists');
          return;
        }
        if (uvuId && uvuId !== actor.username) {
          destroyAndRedirect(req, res, 'Student attempted to view another student log');
          return;
        }
        const mine = allLogs.filter((l) => l.uvuId === actor.username);
        res.json(mine);
        return;
      }

      const courses = await courseRepo.get(new Map([['tenant', req.tenant]]));
      const myCourseIds = courses
        .filter((c) => {
          if (actor.role === 'teacher') return c.teacherId === actor.userId;
          if (actor.role === 'ta') return (c.studentIds ?? []).includes(actor.userId) || c.teacherId === actor.userId;
          return false;
        })
        .map((c) => c.id);

      const visible = allLogs.filter((l) => myCourseIds.includes(l.courseId));
      res.json(visible);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  requireSameTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.session.user;
      if (!actor) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const { courseId, uvuId, text } = req.body ?? {};
      if (typeof courseId !== 'string' || typeof uvuId !== 'string' || typeof text !== 'string') {
        res.status(400).json({ error: 'courseId, uvuId, text required' });
        return;
      }
      if (actor.role === 'student' && uvuId !== actor.username) {
        destroyAndRedirect(req, res, 'Student attempted to write log under another uvuId');
        return;
      }
      const repo = new Repository<Log>(LogModel);
      const now = new Date();
      const date = now.toISOString();
      const log = await repo.save({
        courseId,
        uvuId,
        text,
        date,
        tenant: req.tenant,
      } as Partial<Log>);
      res.status(201).json(log);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
