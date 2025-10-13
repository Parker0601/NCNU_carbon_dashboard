import { Router, Request, Response } from 'express';
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

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    // 1. 數據驗證
    const validatedData = registerSchema.parse(req.body);
    
    // 2. 檢查用戶是否已存在
    const existingUser = await db.select().from(users).where(eq(users.mail, validatedData.email));
    
    if (existingUser.length > 0) {
      return errorResponse(res, 'User with this email already exists', 400);
    }

    // 3. 加密密碼
    const hashedPassword = await hashPassword(validatedData.password);

    // 4. 創建用戶 - 新註冊用戶默認為員工角色
    const [newUser] = await db
      .insert(users)
      .values({
        name: validatedData.name,
        password: hashedPassword,
        role: USER_ROLES.EMPLOYEE, // 默認為員工角色
        mail: validatedData.email,
        status: 'idle', // 新員工預設為空閒狀態
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

    // 5. 生成JWT token (使用any類型避免TypeScript問題)
    const payload = {
      id: newUser.id,
      email: newUser.mail,
      name: newUser.name,
      role: newUser.role,
    };
    const token = (jwt as any).sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

    return successResponse(res, { user: newUser, token }, 'User registered successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Registration failed', 500);
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    // 1. 數據驗證
    const validatedData = loginSchema.parse(req.body);
    
    // 2. 查找用戶
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

    // 3. 驗證密碼
    const isValidPassword = await comparePassword(validatedData.password, user.password);
    if (!isValidPassword) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // 4. 生成JWT token (使用any類型避免TypeScript問題)
    const payload = {
      id: user.id,
      email: user.mail,
      name: user.name,
      role: user.role,
    };
    const token = (jwt as any).sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

    const { password, ...userWithoutPassword } = user;

    return successResponse(res, { user: userWithoutPassword, token }, 'Login successful');
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 401);
    }
    return errorResponse(res, 'Login failed', 500);
  }
});

// Get profile endpoint (protected)
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not found', 404);
    }

    // 查找用戶資料
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
  } catch (error) {
    return errorResponse(res, 'Failed to get profile', 500);
  }
});

// Forget password endpoint - 暫時註解掉此功能
/*
router.post('/forget-password', async (req: Request, res: Response) => {
  try {
    // 1. 數據驗證
    const validatedData = forgetPasswordSchema.parse(req.body);
    
    // 2. 檢查用戶是否存在
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        mail: users.mail,
      })
      .from(users)
      .where(eq(users.mail, validatedData.email));

    if (!user) {
      // 為了安全，即使用戶不存在也返回成功
      return successResponse(res, { message: 'If the email exists, a reset link has been sent' }, 'Password reset email sent');
    }

    // 3. 生成重置token (24小時有效)
    const resetPayload = {
      id: user.id,
      email: user.mail,
      type: 'password_reset',
    };
    const resetToken = (jwt as any).sign(resetPayload, env.JWT_SECRET, { expiresIn: '24h' });

    // 4. 這裡應該發送郵件，但現在先返回token
    // TODO: 實現郵件發送功能
    const resetLink = `http://localhost:8080/reset-password?token=${resetToken}`;

    return successResponse(res, { 
      message: 'Password reset email sent',
      resetLink: resetLink, // 在開發環境中返回，生產環境應該移除
      expiresIn: '24h'
    }, 'Password reset email sent');
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to process password reset request', 500);
  }
});
*/

// Reset password endpoint - 修改為使用email確認用戶
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    // 1. 數據驗證 - 需要email、新密碼和確認密碼
    const { email, newPassword, confirmPassword } = req.body;
    
    if (!email || !newPassword || !confirmPassword) {
      return errorResponse(res, 'Email, new password and confirm password are required', 400);
    }

    // 2. 檢查密碼是否一致
    if (newPassword !== confirmPassword) {
      return errorResponse(res, 'Passwords do not match', 400);
    }

    // 3. 檢查密碼長度（可選，建議至少6位）
    if (newPassword.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long', 400);
    }

    // 4. 檢查用戶是否存在
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

    // 5. 加密新密碼
    const hashedPassword = await hashPassword(newPassword);

    // 6. 更新密碼
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
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to reset password', 500);
  }
});

// Logout endpoint (protected)
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    // 注意：JWT是無狀態的，真正的登出需要客戶端刪除token
    // 這裡可以實現token黑名單機制（可選）
    
    return successResponse(res, { message: 'Logged out successfully' }, 'Logout successful');
  } catch (error) {
    return errorResponse(res, 'Failed to logout', 500);
  }
});

// ===========================================
// 老闆專用功能：員工升級管理
// ===========================================

// 獲取所有員工列表 (僅限老闆)
router.get('/employees', authenticateToken, requireRole([USER_ROLES.BOSS]), async (_req: Request, res: Response) => {
  try {
    // 獲取所有員工（不包括老闆自己）
    const employees = await db
      .select({
        id: users.id,
        name: users.name,
        mail: users.mail,
        role: users.role,
        createTime: users.createTime,
      })
      .from(users)
      .where(eq(users.role, USER_ROLES.EMPLOYEE)); // 只顯示員工

    return successResponse(res, employees, 'Employees retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get employees', 500);
  }
});

// 升級員工角色 (僅限老闆)
router.put('/upgrade/:userId', authenticateToken, requireRole([USER_ROLES.BOSS]), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params['userId'] || '0');
    const { newRole } = req.body;

    // 驗證新角色
    if (!newRole || !Object.values(USER_ROLES).includes(newRole)) {
      return errorResponse(res, 'Invalid role. Valid roles are: 1 (Employee), 2 (Manager), 3 (Boss)', 400);
    }

    // 檢查用戶是否存在且為員工
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

    // 更新用戶角色
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
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to upgrade user', 500);
  }
});

// 獲取角色統計 (僅限老闆)
router.get('/role-stats', authenticateToken, requireRole([USER_ROLES.BOSS]), async (_req: Request, res: Response) => {
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
  } catch (error) {
    return errorResponse(res, 'Failed to get role statistics', 500);
  }
});

export default router; 