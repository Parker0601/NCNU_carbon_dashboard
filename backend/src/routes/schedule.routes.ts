import { Router, Request, Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { schedule, users, devices } from '@/db/schema';
import { authenticateToken, requireUser } from '@/middleware/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/responses';
import { z } from 'zod';

const router = Router();

// 所有 schedule 相關路由需登入
router.use(authenticateToken);
router.use(requireUser);

// 驗證 schema
const createScheduleSchema = z.object({
  userId: z.number().int().positive().optional(), // 預設使用登入者 id
  deviceId: z.number().int().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  startTime: z.string(), // 'YYYY-MM-DD HH:mm:ss' 或 ISO，交由 DB 解析
  endTime: z.string(),
  status: z.enum(['assigned', 'accepted', 'submitted', 'approved', 'rejected']).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['assigned', 'accepted', 'submitted', 'approved', 'rejected']),
});

// ===========================================
// GET /api/schedule - 列出行程（可選 query: userId、自身）
// ===========================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const queryUserId = req.query.userId ? Number(req.query.userId) : undefined;
    const useSelf = req.query.self === 'true' || req.query.self === '1';
    const finalUserId = useSelf ? req.user!.id : queryUserId;

    const q = db
      .select({
        id: schedule.id,
        userId: schedule.userId,
        deviceId: schedule.deviceId,
        title: schedule.title,
        description: schedule.description,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: schedule.status,
        userName: users.name,
      })
      .from(schedule)
      .leftJoin(users, eq(users.id, schedule.userId))
      .orderBy(desc(schedule.startTime));

    let rows = await q;
    if (finalUserId) {
      rows = rows.filter(r => r.userId === finalUserId);
    }

    return successResponse(res, rows, 'Schedules retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get schedules', 500);
  }
});

// ===========================================
// POST /api/schedule - 新增行程
// ===========================================
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const body = createScheduleSchema.parse(req.body);

    const insertUserId = body.userId ?? req.user.id;

    // 若有 deviceId 可選檢查設備存在性（此處先略過為輕量骨架）

    const [row] = await db
      .insert(schedule)
      .values({
        userId: insertUserId,
        deviceId: body.deviceId ?? null,
        title: body.title,
        description: body.description ?? null,
        date: body.date as any,
        startTime: body.startTime as any,
        endTime: body.endTime as any,
        status: (body.status ?? 'assigned') as any,
      })
      .returning();

    return successResponse(res, row, 'Schedule created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, error.issues.map(i => i.message).join('; '), 400);
    }
    return errorResponse(res, 'Failed to create schedule', 500);
  }
});

// ===========================================
// PATCH /api/schedule/:id/status - 更新行程狀態
// ===========================================
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const id = Number(req.params['id']);
    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse(res, 'Invalid schedule id', 400);
    }

    const { status } = updateStatusSchema.parse(req.body);

    const [updated] = await db
      .update(schedule)
      .set({ status: status as any })
      .where(eq(schedule.id, id))
      .returning();

    if (!updated) {
      return notFoundResponse(res, 'Schedule not found');
    }

    return successResponse(res, updated, 'Schedule status updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, error.issues.map(i => i.message).join('; '), 400);
    }
    return errorResponse(res, 'Failed to update schedule status', 500);
  }
});

export default router;
