import { Router } from 'express';
import { authenticateToken, USER_ROLES } from '@/middleware/auth';
import { renderNavHtml } from '@/services/nav';
export const navRouter = Router();
const ROLE_MAP = {
    [USER_ROLES.EMPLOYEE]: 'employee',
    [USER_ROLES.MANAGER]: 'manager',
    [USER_ROLES.BOSS]: 'boss',
    staff: 'employee',
    manager: 'manager',
    boss: 'boss',
};
const normalizeRole = (raw) => ROLE_MAP[String(raw ?? '')];
navRouter.get('/', authenticateToken, (req, res) => {
    const role = normalizeRole(req.user?.role);
    if (!role) {
        res.status(403).send('Forbidden');
        return;
    }
    const html = renderNavHtml(role);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.set('X-User-Role', role);
    res.send(html);
});
export default navRouter;
//# sourceMappingURL=nav.routes.js.map