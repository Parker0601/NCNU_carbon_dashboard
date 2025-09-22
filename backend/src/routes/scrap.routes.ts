import { Router, Request, Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { scraps } from '@/db/schema';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/responses';
import { authenticateToken, requireUser } from '@/middleware/auth';
import { createScrapDataSchema, updateScrapDataSchema } from '../validators/scrap.validator';

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(requireUser);

// Get scraps by deviceId with selected fields
router.get('/device/:deviceId', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params['deviceId'] || '0');

    const data = await db
      .select({
        id: scraps.id,
        deviceId: scraps.deviceId,
        type: scraps.type,
        status: scraps.status,
        weight: scraps.weight,
        volume: scraps.volume,
        humidity: scraps.humidity,
      })
      .from(scraps)
      .where(eq(scraps.deviceId, deviceId))
      .orderBy(desc(scraps.id));

    return successResponse(res, data, 'Scrap data by device retrieved successfully');
  } catch (_error) {
    return errorResponse(res, 'Failed to get scrap data by device', 500);
  }
});

// Get latest scrap by deviceId
router.get('/device/:deviceId/latest', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params['deviceId'] || '0');

    const [data] = await db
      .select({
        id: scraps.id,
        deviceId: scraps.deviceId,
        type: scraps.type,
        status: scraps.status,
        weight: scraps.weight,
        volume: scraps.volume,
        humidity: scraps.humidity,
      })
      .from(scraps)
      .where(eq(scraps.deviceId, deviceId))
      .orderBy(desc(scraps.id))
      .limit(1);

    if (!data) {
      return notFoundResponse(res, 'No scrap data found for this device');
    }

    return successResponse(res, data, 'Latest scrap data by device retrieved successfully');
  } catch (_error) {
    return errorResponse(res, 'Failed to get latest scrap data by device', 500);
  }
});

// Create scrap data
router.post('/device/:deviceId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const deviceId = parseInt(req.params['deviceId'] || '0', 10);
    if (Number.isNaN(deviceId)) {
      return errorResponse(res, 'Invalid deviceId', 400);
    }

    // ---- 相容前端多種命名 + 提供 schema 必填的預設值 ----
    const rawType = (req.body?.type ?? req.body?.wasteType ?? '').toString().trim();
    if (!rawType) return errorResponse(res, 'type is required', 400);

    const toInt = (v: any, def = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.round(n) : def;
    };

    const weight  = Number(req.body?.weight ?? req.body?.amount ?? NaN);
    if (!Number.isFinite(weight) || weight < 0) return errorResponse(res, 'weight must be >= 0', 400);

    const payloadForZod = {
      // 你的 createScrapDataSchema 須包含這些欄位（依你 schema.ts）
      deviceId,
      type: rawType,
      status: (req.body?.status ?? '1').toString(), // scrap_status enum: '1' | '2' | '3'
      humidity: toInt(req.body?.humidity, 0),
      weight: toInt(weight, 0),
      volume: toInt(req.body?.volume, 0),
    };

    // 先用 Zod 驗證（這步不含 userId，避免讓前端可控）
    const validated = createScrapDataSchema.parse(payloadForZod);

    // 再把 userId（從登入）補進去以符合資料表必填
    const toInsert = {
      ...validated,
      userId: Number(req.user.id),
    };

    const [created] = await db
      .insert(scraps)
      .values(toInsert)
      .returning();

    return successResponse(res, created, 'Scrap data created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to create scrap data', 500);
  }
});

// Get current user's scrap data
router.get('/my-data', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const data = await db
      .select()
      .from(scraps)
      .where(eq(scraps.userId, req.user.id))
      .orderBy(desc(scraps.id));

    return successResponse(res, data, 'Scrap data retrieved successfully');
  } catch (_error) {
    return errorResponse(res, 'Failed to get scrap data', 500);
  }
});

// Get scrap data by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params['id'] || '0');

    const [data] = await db
      .select()
      .from(scraps)
      .where(eq(scraps.id, id));

    if (!data) {
      return notFoundResponse(res, 'Scrap data not found');
    }

    return successResponse(res, data, 'Scrap data retrieved successfully');
  } catch (_error) {
    return errorResponse(res, 'Failed to get scrap data', 500);
  }
});


// Update scrap data (only owner)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const id = parseInt(req.params['id'] || '0');
    const validated = updateScrapDataSchema.parse(req.body);

    const [updated] = await db
      .update(scraps)
      .set({
        deviceId: validated.deviceId ?? undefined,
        type: validated.type ?? undefined,
        status: validated.status ?? undefined,
        humidity: validated.humidity ?? undefined,
        weight: validated.weight ?? undefined,
        volume: validated.volume ?? undefined,
      })
      .where(and(eq(scraps.id, id), eq(scraps.userId, Number(req.user.id))))
      .returning();

    if (!updated) {
      return notFoundResponse(res, 'Scrap data not found or not authorized');
    }

    return successResponse(res, updated, 'Scrap data updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to update scrap data', 500);
  }
});

// Delete scrap data (only owner)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const id = parseInt(req.params['id'] || '0');

    const [deleted] = await db
      .delete(scraps)
      .where(and(eq(scraps.id, id), eq(scraps.userId, Number(req.user.id))))
      .returning();

    if (!deleted) {
      return notFoundResponse(res, 'Scrap data not found or not authorized');
    }

    return successResponse(res, null, 'Scrap data deleted successfully');
  } catch (_error) {
    return errorResponse(res, 'Failed to delete scrap data', 500);
  }
});


// ------------------------------------------------------------------
// ⭐ 新增的路由
// ------------------------------------------------------------------

// GET /api/scrap/device/:deviceId/history?limit=30
router.get('/device/:deviceId/history', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params['deviceId'] || '0', 10);
    if (Number.isNaN(deviceId)) {
      return errorResponse(res, 'Invalid deviceId', 400);
    }

    const limit = req.query.limit ? Math.max(1, Math.min(500, parseInt(String(req.query.limit), 10))) : 30;

    const data = await db
      .select({
        id: scraps.id,
        deviceId: scraps.deviceId,
        type: scraps.type,
        status: scraps.status,
        weight: scraps.weight,
        volume: scraps.volume,
        humidity: scraps.humidity,
      })
      .from(scraps)
      .where(eq(scraps.deviceId, deviceId))
      .orderBy(desc(scraps.id))
      .limit(limit);

    if (!data.length) {
      return notFoundResponse(res, 'No scrap history found for this device');
    }

    // 補充 amount/date 欄位，讓前端可以直接用
    const shaped = data.map((r) => ({
      ...r,
      amount: Number(r.weight || 0),
      date: undefined, // 目前沒有時間欄位，暫時空著
    }));

    return successResponse(res, shaped, 'Scrap history retrieved successfully');
  } catch (_error) {
    return errorResponse(res, 'Failed to get scrap history', 500);
  }
});



export default router;
