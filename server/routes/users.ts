import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Repository } from '../db/Repository';
import { User, UserModel } from '../models/User';
import { tenantFromParam } from '../middleware/tenant';
import { requireRole, destroyAndRedirect } from '../middleware/auth';
import { isRole, Role } from '../types';

const router = express.Router({ mergeParams: true });

router.use(tenantFromParam);

const sanitize = (user: User) => ({
  id: (user as unknown as { _id: { toString: () => string } })._id.toString(),
  username: user.username,
  role: user.role,
  tenant: user.tenant,
});

const canCreate = (actor: Role, target: Role): boolean => {
  if (actor === 'admin') return ['admin', 'teacher', 'ta', 'student'].includes(target);
  if (actor === 'teacher') return target === 'student' || target === 'ta';
  if (actor === 'ta') return target === 'student';
  return false;
};

router.get(
  '/',
  requireRole('admin', 'teacher', 'ta'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = new Repository<User>(UserModel);
      const filters = new Map<string, unknown>();
      filters.set('tenant', req.tenant);
      const role = typeof req.query.role === 'string' ? req.query.role : null;
      if (role && isRole(role)) filters.set('role', role);
      const users = await repo.get(filters);
      res.json(users.map(sanitize));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  requireRole('admin', 'teacher', 'ta'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.session.user;
      if (!actor) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const { username, password, role } = req.body ?? {};
      if (typeof username !== 'string' || typeof password !== 'string' || !isRole(role)) {
        res.status(400).json({ error: 'username, password, and valid role required' });
        return;
      }
      if (!canCreate(actor.role, role)) {
        destroyAndRedirect(
          req,
          res,
          `Role '${actor.role}' not permitted to create '${role}'`
        );
        return;
      }
      const repo = new Repository<User>(UserModel);
      const existing = await repo.findOne({ username, tenant: req.tenant });
      if (existing) {
        res.status(409).json({ error: 'Username already taken' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await repo.save({
        username,
        passwordHash,
        role,
        tenant: req.tenant,
        createdBy: actor.username,
      } as Partial<User>);
      res.status(201).json(sanitize(user));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
