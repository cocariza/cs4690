import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Repository } from '../db/Repository';
import { User, UserModel } from '../models/User';
import { tenantFromParam } from '../middleware/tenant';
import { isRole, Role } from '../types';

const router = express.Router({ mergeParams: true });

router.use(tenantFromParam);

const sanitize = (user: User): Record<string, unknown> => ({
  id: (user as unknown as { _id: { toString: () => string } })._id.toString(),
  username: user.username,
  role: user.role,
  tenant: user.tenant,
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'username and password required' });
      return;
    }
    const repo = new Repository<User>(UserModel);
    const user = await repo.findOne({ username, tenant: req.tenant });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const id = (user as unknown as { _id: { toString: () => string } })._id.toString();
    req.session.user = {
      userId: id,
      username: user.username,
      role: user.role,
      tenant: user.tenant,
    };
    res.json({ user: sanitize(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, role } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'username and password required' });
      return;
    }
    const requestedRole: Role = isRole(role) ? role : 'student';
    if (requestedRole !== 'student') {
      res.status(403).json({ error: 'Self signup is limited to the student role' });
      return;
    }
    if (password.length < 3) {
      res.status(400).json({ error: 'Password too short' });
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
      role: requestedRole,
      tenant: req.tenant,
    } as Partial<User>);
    const id = (user as unknown as { _id: { toString: () => string } })._id.toString();
    req.session.user = {
      userId: id,
      username: user.username,
      role: user.role,
      tenant: user.tenant,
    };
    res.status(201).json({ user: sanitize(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', (req: Request, res: Response) => {
  const user = req.session.user;
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (user.tenant !== req.tenant) {
    req.session.destroy(() => {
      res.status(401).json({ error: 'Tenant mismatch', redirect: `/${req.tenant}/login.html` });
    });
    return;
  }
  res.json({ user });
});

export default router;
