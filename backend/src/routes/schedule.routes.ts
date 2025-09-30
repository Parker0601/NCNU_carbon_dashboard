import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { devices, issues, users } from '@/db/schema';
import { authenticateToken, requireUser, requireAdmin } from '@/middleware/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/responses';
import { z } from 'zod';

const router = Router();

// 所有 schedule 相關路由需登入
router.use(authenticateToken);
router.use(requireUser);

// 驗證 schema
const assignHumanResourceSchema = z.object({
  issueId: z.number().int().positive(),
  assignerId: z.number().int().positive(),
});

// ===========================================
// GET /api/schedule/assign-human-resource - 主管查看故障設備和可指派員工
// ===========================================
router.get('/assign-human-resource', requireAdmin, async (_req: Request, res: Response) => {
  try {
    // 1. 獲取故障設備 (device_status = '3')
    const faultyDevices = await db
      .select({
        deviceId: devices.id,
        deviceName: devices.name,
        deviceStatus: devices.status,
        bootTime: devices.bootTime,
        ratio: devices.ratio
      })
      .from(devices)
      .where(eq(devices.status, '3')); // 3: 故障

    // 2. 獲取所有員工 (role = '1') 及其狀態
    const availableStaff = await db
      .select({
        userId: users.id,
        userName: users.name,
        userRole: users.role,
        userStatus: users.status, // 假設已新增此欄位
        mail: users.mail
      })
      .from(users)
      .where(eq(users.role, '1')); // 1: 一般員工

    // 3. 獲取現有的問題記錄
    const existingIssues = await db
      .select({
        issueId: issues.id,
        deviceId: issues.deviceId,
        description: issues.description,
        status: issues.status,
        assignerId: issues.assigner,
        createTime: issues.createTime
      })
      .from(issues)
      .where(eq(issues.status, '1')); // 1: 待處理

    return successResponse(res, {
      faultyDevices,
      availableStaff,
      existingIssues
    }, 'Human resource assignment data retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get human resource assignment data', 500);
  }
});

// ===========================================
// POST /api/schedule/assign-human-resource - 主管指派員工處理設備問題
// ===========================================
router.post('/assign-human-resource', requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const { issueId, assignerId } = assignHumanResourceSchema.parse(req.body);

    // 檢查問題是否存在
    const [existingIssue] = await db
      .select()
      .from(issues)
      .where(eq(issues.id, issueId));

    if (!existingIssue) {
      return notFoundResponse(res, 'Issue not found');
    }

    // 檢查指派員工是否存在且為一般員工
    const [assignee] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, assignerId), eq(users.role, '1')));

    if (!assignee) {
      return errorResponse(res, 'Invalid assignee or user is not a staff member', 400);
    }

    // 更新問題的 assigner
    const [updatedIssue] = await db
      .update(issues)
      .set({
        assigner: assignerId,
        status: '2' // 2: 處理中
      })
      .where(eq(issues.id, issueId))
      .returning();

    // 更新員工狀態為忙碌
    await db
      .update(users)
      .set({ status: 'busy' })
      .where(eq(users.id, assignerId));

    return successResponse(res, {
      issueId: updatedIssue.id,
      assignerId: updatedIssue.assigner,
      status: updatedIssue.status,
      message: 'Staff member assigned successfully'
    }, 'Staff member assigned to issue successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, error.issues.map(i => i.message).join('; '), 400);
    }
    return errorResponse(res, 'Failed to assign staff member', 500);
  }
});

export default router;