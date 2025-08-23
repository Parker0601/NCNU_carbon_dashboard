import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { devices, maintenance } from '@/db/schema';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/responses';
import { authenticateToken, requireUser } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(requireUser);

// Get all devices
router.get('/', async (req: Request, res: Response) => {
  try {
    // 獲取所有設備
    const deviceList = await db
      .select()
      .from(devices)
      .orderBy(desc(devices.id));

    return successResponse(res, deviceList, 'Devices retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get devices', 500);
  }
});

// Get device by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params['id'] || '0');
    
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, id));

    if (!device) {
      return notFoundResponse(res, 'Device not found');
    }

    return successResponse(res, device, 'Device retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get device', 500);
  }
});

// Get device maintenance history
router.get('/:id/maintenance', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params['id'] || '0');
    
    const maintenanceHistory = await db
      .select()
      .from(maintenance)
      .where(eq(maintenance.deviceId, deviceId))
      .orderBy(desc(maintenance.id));

    return successResponse(res, maintenanceHistory, 'Maintenance history retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get maintenance history', 500);
  }
});

// Create maintenance record
router.post('/maintenance', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const { deviceId, type, description, maintenanceTime } = req.body;

    // 驗證必要欄位
    if (!deviceId || !type || !description || !maintenanceTime) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    // 創建維護記錄
    const [newMaintenance] = await db
      .insert(maintenance)
      .values({
        deviceId: parseInt(deviceId),
        userId: req.user.id,
        type,
        description,
        maintenanceTime: new Date(maintenanceTime),
        createdAt: new Date()
      })
      .returning();

    return successResponse(res, newMaintenance, 'Maintenance record created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to create maintenance record', 500);
  }
});

// Update device status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const id = parseInt(req.params['id'] || '0');
    const { status, runtime } = req.body;

    // 更新設備狀態
    const [updatedDevice] = await db
      .update(devices)
      .set({
        status,
        runtime: runtime || 0,
        updatedAt: new Date()
      })
      .where(eq(devices.id, id))
      .returning();

    if (!updatedDevice) {
      return notFoundResponse(res, 'Device not found');
    }

    return successResponse(res, updatedDevice, 'Device status updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to update device status', 500);
  }
});

// Get maintenance statistics
router.get('/maintenance/stats', async (req: Request, res: Response) => {
  try {
    // 獲取維護統計數據
    const stats = await db
      .select({
        totalMaintenance: db.fn.count(maintenance.id),
        routineMaintenance: db.fn.count(maintenance.id).where(eq(maintenance.type, 'routine')),
        repairMaintenance: db.fn.count(maintenance.id).where(eq(maintenance.type, 'repair')),
        inspectionMaintenance: db.fn.count(maintenance.id).where(eq(maintenance.type, 'inspection'))
      })
      .from(maintenance);

    return successResponse(res, stats[0], 'Maintenance statistics retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get maintenance statistics', 500);
  }
});

export default router;
