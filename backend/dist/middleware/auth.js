import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { unauthorizedResponse, forbiddenResponse } from '@/utils/responses';
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        unauthorizedResponse(res, 'Access token required');
        return;
    }
    if (!env.JWT_SECRET) {
        unauthorizedResponse(res, 'JWT secret not configured');
        return;
    }
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        unauthorizedResponse(res, 'Invalid or expired token');
    }
};
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            unauthorizedResponse(res, 'Authentication required');
            return;
        }
        if (!roles.includes(req.user.role)) {
            forbiddenResponse(res, 'Insufficient permissions');
            return;
        }
        next();
    };
};
export const USER_ROLES = {
    EMPLOYEE: '1',
    MANAGER: '2',
    BOSS: '3'
};
export const requireAdmin = requireRole([USER_ROLES.MANAGER, USER_ROLES.BOSS]);
export const requireReviewer = requireRole([USER_ROLES.MANAGER, USER_ROLES.BOSS]);
export const requireUser = requireRole([USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER, USER_ROLES.BOSS]);
//# sourceMappingURL=auth.js.map