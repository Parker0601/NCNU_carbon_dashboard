import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword, comparePassword } from '@/utils/passwords';
import { successResponse, errorResponse } from '@/utils/responses';
import { loginSchema, registerSchema } from '@/validators/auth.validator';
import { authenticateToken, requireRole, USER_ROLES } from '@/middleware/auth';
import { env } from '@/config/env';
const router = Router();
router.post('/register', async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const existingUser = await db.select().from(users).where(eq(users.mail, validatedData.email));
        if (existingUser.length > 0) {
            return errorResponse(res, 'User with this email already exists', 400);
        }
        const hashedPassword = await hashPassword(validatedData.password);
        const [newUser] = await db
            .insert(users)
            .values({
            name: validatedData.name,
            password: hashedPassword,
            role: USER_ROLES.EMPLOYEE,
            mail: validatedData.email,
            status: 'idle',
            createTime: new Date(),
        })
            .returning({
            id: users.id,
            name: users.name,
            role: users.role,
            mail: users.mail,
        });
        if (!newUser) {
            return errorResponse(res, 'Failed to create user', 500);
        }
        const payload = {
            id: newUser.id,
            email: newUser.mail,
            name: newUser.name,
            role: newUser.role,
        };
        const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
        return successResponse(res, { user: newUser, token }, 'User registered successfully', 201);
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResponse(res, error.message, 400);
        }
        return errorResponse(res, 'Registration failed', 500);
    }
});
router.post('/login', async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const [user] = await db
            .select({
            id: users.id,
            name: users.name,
            role: users.role,
            password: users.password,
            mail: users.mail,
        })
            .from(users)
            .where(eq(users.mail, validatedData.email));
        if (!user) {
            return errorResponse(res, 'Invalid email or password', 401);
        }
        const isValidPassword = await comparePassword(validatedData.password, user.password);
        if (!isValidPassword) {
            return errorResponse(res, 'Invalid email or password', 401);
        }
        const payload = {
            id: user.id,
            email: user.mail,
            name: user.name,
            role: user.role,
        };
        const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
        const { password, ...userWithoutPassword } = user;
        return successResponse(res, { user: userWithoutPassword, token }, 'Login successful');
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResponse(res, error.message, 401);
        }
        return errorResponse(res, 'Login failed', 500);
    }
});
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not found', 404);
        }
        const [user] = await db
            .select({
            id: users.id,
            name: users.name,
            role: users.role,
            mail: users.mail,
            createTime: users.createTime,
        })
            .from(users)
            .where(eq(users.id, req.user.id));
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }
        return successResponse(res, user, 'Profile retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get profile', 500);
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        if (!email || !newPassword || !confirmPassword) {
            return errorResponse(res, 'Email, new password and confirm password are required', 400);
        }
        if (newPassword !== confirmPassword) {
            return errorResponse(res, 'Passwords do not match', 400);
        }
        if (newPassword.length < 6) {
            return errorResponse(res, 'Password must be at least 6 characters long', 400);
        }
        const [user] = await db
            .select({
            id: users.id,
            mail: users.mail,
            name: users.name,
        })
            .from(users)
            .where(eq(users.mail, email));
        if (!user) {
            return errorResponse(res, 'User not found with this email', 404);
        }
        const hashedPassword = await hashPassword(newPassword);
        await db
            .update(users)
            .set({
            password: hashedPassword,
        })
            .where(eq(users.id, user.id));
        return successResponse(res, {
            message: 'Password updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.mail
            }
        }, 'Password reset successful');
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResponse(res, error.message, 400);
        }
        return errorResponse(res, 'Failed to reset password', 500);
    }
});
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        return successResponse(res, { message: 'Logged out successfully' }, 'Logout successful');
    }
    catch (error) {
        return errorResponse(res, 'Failed to logout', 500);
    }
});
router.get('/employees', authenticateToken, requireRole([USER_ROLES.BOSS]), async (_req, res) => {
    try {
        const employees = await db
            .select({
            id: users.id,
            name: users.name,
            mail: users.mail,
            role: users.role,
            createTime: users.createTime,
        })
            .from(users)
            .where(eq(users.role, USER_ROLES.EMPLOYEE));
        return successResponse(res, employees, 'Employees retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get employees', 500);
    }
});
router.put('/upgrade/:userId', authenticateToken, requireRole([USER_ROLES.BOSS]), async (req, res) => {
    try {
        const userId = parseInt(req.params['userId'] || '0');
        const { newRole } = req.body;
        if (!newRole || !Object.values(USER_ROLES).includes(newRole)) {
            return errorResponse(res, 'Invalid role. Valid roles are: 1 (Employee), 2 (Manager), 3 (Boss)', 400);
        }
        const [user] = await db
            .select({
            id: users.id,
            name: users.name,
            mail: users.mail,
            role: users.role,
        })
            .from(users)
            .where(eq(users.id, userId));
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }
        if (user.role !== USER_ROLES.EMPLOYEE) {
            return errorResponse(res, 'Can only upgrade employees', 400);
        }
        const [updatedUser] = await db
            .update(users)
            .set({
            role: newRole,
        })
            .where(eq(users.id, userId))
            .returning({
            id: users.id,
            name: users.name,
            mail: users.mail,
            role: users.role,
        });
        return successResponse(res, {
            user: updatedUser,
            message: `User ${updatedUser.name} has been upgraded to ${newRole === USER_ROLES.MANAGER ? 'Manager' : 'Boss'}`
        }, 'User upgraded successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResponse(res, error.message, 400);
        }
        return errorResponse(res, 'Failed to upgrade user', 500);
    }
});
router.get('/role-stats', authenticateToken, requireRole([USER_ROLES.BOSS]), async (_req, res) => {
    try {
        const allUsers = await db
            .select({
            role: users.role,
        })
            .from(users);
        const stats = {
            total: allUsers.length,
            employees: allUsers.filter(u => u.role === USER_ROLES.EMPLOYEE).length,
            managers: allUsers.filter(u => u.role === USER_ROLES.MANAGER).length,
            bosses: allUsers.filter(u => u.role === USER_ROLES.BOSS).length,
        };
        return successResponse(res, stats, 'Role statistics retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get role statistics', 500);
    }
});
export default router;
//# sourceMappingURL=auth.routes.js.map