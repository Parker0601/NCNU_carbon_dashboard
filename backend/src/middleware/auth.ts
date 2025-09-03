import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { unauthorizedResponse, forbiddenResponse } from '@/utils/responses';

export interface JwtPayload {
  id: number;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    unauthorizedResponse(res, 'Access token required');
    return;
  }

  // 檢查JWT_SECRET是否存在
  if (!env.JWT_SECRET) {
    unauthorizedResponse(res, 'JWT secret not configured');
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    unauthorizedResponse(res, 'Invalid or expired token');
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

// 角色定義常數
export const USER_ROLES = {
  EMPLOYEE: '1',    // 一般員工
  MANAGER: '2',     // 主管
  BOSS: '3'         // 老闆
} as const;

export const requireAdmin = requireRole([USER_ROLES.MANAGER, USER_ROLES.BOSS]); // 主管和老闆
export const requireReviewer = requireRole([USER_ROLES.MANAGER, USER_ROLES.BOSS]); // 主管和老闆
export const requireUser = requireRole([USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER, USER_ROLES.BOSS]); // 所有員工 