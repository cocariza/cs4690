import express, { Request, Response, NextFunction } from 'express';
import { Repository } from '../db/Repository';
import { Course, CourseModel } from '../models/Course';
import { tenantFromParam } from '../middleware/tenant';
import { requireRole, requireSameTenant, destroyAndRedirect } from '../middleware/auth';

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
      const repo = new Repository<Course>(CourseModel);
      const filters = new Map<string, unknown>();
      filters.set('tenant', req.tenant);
      const all = await repo.get(filters);
      let visible = all;
      if (actor.role === 'teacher') {
        visible = all.filter((c) => c.teacherId === actor.userId);
      } else if (actor.role === 'ta') {
        visible = all.filter((c) => (c.studentIds ?? []).includes(actor.userId) || c.teacherId === actor.userId);
      } else if (actor.role === 'student') {
        visible = all.filter((c) => (c.studentIds ?? []).includes(actor.userId));
      }
      res.json(visible);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/all',
  requireSameTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = new Repository<Course>(CourseModel);
      const filters = new Map<string, unknown>();
      filters.set('tenant', req.tenant);
      const all = await repo.get(filters);
      res.json(all);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.session.user;
      if (!actor) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const { id, display, teacherId } = req.body ?? {};
      if (typeof id !== 'string' || typeof display !== 'string') {
        res.status(400).json({ error: 'id and display required' });
        return;
      }
      const repo = new Repository<Course>(CourseModel);
      const existing = await repo.findOne({ id, tenant: req.tenant });
      if (existing) {
        res.status(409).json({ error: 'Course id already exists' });
        return;
      }
      const assignedTeacher =
        actor.role === 'teacher' ? actor.userId : (typeof teacherId === 'string' ? teacherId : undefined);
      const course = await repo.save({
        id,
        display,
        tenant: req.tenant,
        teacherId: assignedTeacher,
        studentIds: [],
      } as Partial<Course>);
      res.status(201).json(course);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:courseId/enroll',
  requireSameTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.session.user;
      if (!actor) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const { studentId } = req.body ?? {};
      const targetId =
        actor.role === 'student'
          ? actor.userId
          : (typeof studentId === 'string' ? studentId : null);
      if (!targetId) {
        res.status(400).json({ error: 'studentId required' });
        return;
      }
      if (actor.role !== 'student' && !['admin', 'teacher', 'ta'].includes(actor.role)) {
        destroyAndRedirect(req, res, 'Role not permitted to enroll others');
        return;
      }
      const repo = new Repository<Course>(CourseModel);
      const course = await repo.findOne({ id: req.params.courseId, tenant: req.tenant });
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }
      const ids = new Set(course.studentIds ?? []);
      ids.add(targetId);
      const updated = await repo.update(
        { id: req.params.courseId, tenant: req.tenant },
        { studentIds: Array.from(ids) }
      );
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:courseId/add-student',
  requireRole('admin', 'teacher', 'ta'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.body ?? {};
      if (typeof studentId !== 'string') {
        res.status(400).json({ error: 'studentId required' });
        return;
      }
      const repo = new Repository<Course>(CourseModel);
      const course = await repo.findOne({ id: req.params.courseId, tenant: req.tenant });
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }
      const ids = new Set(course.studentIds ?? []);
      ids.add(studentId);
      const updated = await repo.update(
        { id: req.params.courseId, tenant: req.tenant },
        { studentIds: Array.from(ids) }
      );
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
