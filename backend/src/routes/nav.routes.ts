import { Router, type Request, type Response } from 'express';
import { authenticateToken, USER_ROLES } from '@/middleware/auth';
import { renderNavHtml } from '@/services/nav';

export const navRouter = Router();

type Role = 'boss' | 'manager' | 'employee';
const ROLE_MAP: Record<string, Role> = {
  [USER_ROLES.EMPLOYEE]: 'employee',
  [USER_ROLES.MANAGER]:  'manager',
  [USER_ROLES.BOSS]:     'boss',
  staff: 'employee',
  manager: 'manager',
  boss: 'boss',
};
const normalizeRole = (raw: unknown): Role | undefined =>
  ROLE_MAP[String(raw ?? '')];

// ✅ 這裡改成 '/'
navRouter.get('/', authenticateToken, (req: Request, res: Response): void => {
  const role = normalizeRole(req.user?.role);
  if (!role) { res.status(403).send('Forbidden'); return; }

  const html = renderNavHtml(role);
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.set('X-User-Role', role);
  res.send(html);
});

export default navRouter;
