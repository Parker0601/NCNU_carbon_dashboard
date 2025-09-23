import { Request, Response, NextFunction } from 'express';
export interface JwtPayload {
    id: number;
    email: string;
    name: string;
    role: string;
    iat: number;
    exp: number;
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const USER_ROLES: {
    readonly EMPLOYEE: "1";
    readonly MANAGER: "2";
    readonly BOSS: "3";
};
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireReviewer: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireUser: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map