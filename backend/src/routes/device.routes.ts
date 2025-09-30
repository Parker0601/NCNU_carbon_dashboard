import { Router, Request, Response } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { devices, issues, maintenanceRecords, users } from '@/db/schema';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/responses';
import { authenticateToken, requireUser, requireAdmin } from '@/middleware/auth';
import { 
  reportIssueSchema, 
  maintenanceRecordSchema, 
  updateDeviceStatusSchema
} from '@/validators/device.validator';

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(requireUser);

// ===========================================
// 1. getDevice - 獲取所有設備列表 (僅限主管和老闆)
// ===========================================
router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    // 獲取所有設備
    const deviceList = await db
      .select({
        id: devices.id,
        name: devices.name,
        status: devices.status,
        bootTime: devices.bootTime,
        ratio: devices.ratio
      })
      .from(devices)
      .orderBy(desc(devices.id));

    return successResponse(res, deviceList, 'Devices retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get devices', 500);
  }
});

// ===========================================
// 2. getDeviceStatus - 查看設備狀態
// ===========================================
router.get('/status', async (_req: Request, res: Response) => {
  try {
    // 獲取設備狀態 (ID, Status, Name)
    const deviceStatus = await db
      .select({
        id: devices.id,
        status: devices.status,
        name: devices.name,
        bootTime: devices.bootTime,
        ratio: devices.ratio
      })
      .from(devices)
      .orderBy(devices.id);

    return successResponse(res, deviceStatus, 'Device status retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get device status', 500);
  }
});

// ===========================================
// 3. reportIssue - 設備問題回報 (依賴User)
// ===========================================
router.post('/report-issue', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    // 1. 數據驗證
    const validatedData = reportIssueSchema.parse(req.body);
    const { deviceId, name, description } = validatedData;

    // 檢查設備是否存在
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId));

    if (!device) {
      return notFoundResponse(res, 'Device not found');
    }

    // 創建問題記錄
    const [newIssue] = await db
      .insert(issues)
      .values({
        deviceId: deviceId,
        description,
        issuer: req.user.id,
        assigner: req.user.id, // 暫時指派給回報者
        status: '1', // 1: 待處理
        createTime: new Date()
      })
      .returning();

    return successResponse(res, {
      issueId: newIssue.id,
      deviceId: newIssue.deviceId,
      name,
      description: newIssue.description,
      status: newIssue.status,
      createTime: newIssue.createTime,
      // 新增員工資訊
      employee: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role,
        email: req.user.email
      }
    }, 'Issue reported successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to report issue', 500);
  }
});

// ===========================================
// 4. recordMaintenance - 寫入維修紀錄 (依賴User)
// ===========================================
router.post('/maintenance', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    // 1. 數據驗證
    const validatedData = maintenanceRecordSchema.parse(req.body);
    const { deviceId, name, description, endTime } = validatedData;

    // 檢查設備是否存在
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId));

    if (!device) {
      return notFoundResponse(res, 'Device not found');
    }

    // 先創建一個 issue 記錄（如果沒有的話）
    let issueId = deviceId;
    
         // 檢查是否已經有相關的 issue
     const [existingIssue] = await db
       .select()
       .from(issues)
       .where(eq(issues.deviceId, deviceId))
       .limit(1);
     
     if (!existingIssue) {
       // 創建新的 issue 記錄
       const [newIssue] = await db
         .insert(issues)
         .values({
           deviceId: deviceId,
           description: `維修記錄: ${description}`,
           issuer: req.user.id,
           assigner: null, // 暫時不指派，後續用 API 指派維修者
           status: '3', // 3: 已解決 (維修完成)
           createTime: new Date()
         })
         .returning();
       issueId = newIssue.id;
     } else {
       // 更新現有 issue 的狀態為已解決
       await db
         .update(issues)
         .set({
           status: '3', // 3: 已解決
           description: `維修完成: ${description}`
         })
         .where(eq(issues.id, existingIssue.id));
       issueId = existingIssue.id;
     }

    // 創建維修記錄
    const [newMaintenance] = await db
      .insert(maintenanceRecords)
      .values({
        issueId: issueId,
        userId: req.user.id,
        description,
        createTime: new Date(),
        endTime: new Date(endTime)
      })
      .returning();

    return successResponse(res, {
      recordId: newMaintenance.id,
      deviceId: deviceId,
      name,
      description: newMaintenance.description,
      createTime: newMaintenance.createTime,
      endTime: newMaintenance.endTime,
      // 新增維修員工資訊
      employee: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role,
        email: req.user.email
      }
    }, 'Maintenance record created successfully', 201);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Failed to create maintenance record', 500);
  }
});

// ===========================================
// 5. getMaintainDevice - 獲取設備維護歷史
// ===========================================
router.get('/maintenance-history', async (_req: Request, res: Response) => {
  try {
    // 獲取設備維護歷史
    // 包含：Device(ID,Status,Name,RunRatio,RunTime), Record(ID,Status,Name,Description)
    const maintenanceHistory = await db
      .select({
        // Device 資訊
        deviceId: devices.id,
        deviceStatus: devices.status,
        deviceName: devices.name,
        runRatio: devices.ratio,
        runTime: devices.bootTime,
        // Record 資訊
        recordId: maintenanceRecords.id,
        recordDescription: maintenanceRecords.description,
        recordCreateTime: maintenanceRecords.createTime,
        recordEndTime: maintenanceRecords.endTime,
        // User 資訊
        userName: users.name
      })
      .from(maintenanceRecords)
      .innerJoin(issues, eq(maintenanceRecords.issueId, issues.id))
      .innerJoin(devices, eq(issues.deviceId, devices.id))
      .innerJoin(users, eq(maintenanceRecords.userId, users.id))
      .orderBy(desc(maintenanceRecords.createTime));

    return successResponse(res, maintenanceHistory, 'Maintenance history retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get maintenance history', 500);
  }
});

// ===========================================
// 6. 獲取特定設備的維護歷史
// ===========================================
router.get('/:id/maintenance', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params['id'] || '0');
    
    const deviceMaintenanceHistory = await db
      .select({
        // Device 資訊
        deviceId: devices.id,
        deviceStatus: devices.status,
        deviceName: devices.name,
        runRatio: devices.ratio,
        runTime: devices.bootTime,
        // Record 資訊
        recordId: maintenanceRecords.id,
        recordDescription: maintenanceRecords.description,
        recordCreateTime: maintenanceRecords.createTime,
        recordEndTime: maintenanceRecords.endTime,
        // User 資訊
        userName: users.name
      })
      .from(maintenanceRecords)
      .innerJoin(issues, eq(maintenanceRecords.issueId, issues.id))
      .innerJoin(devices, eq(issues.deviceId, devices.id))
      .innerJoin(users, eq(maintenanceRecords.userId, users.id))
      .where(eq(devices.id, deviceId))
      .orderBy(desc(maintenanceRecords.createTime));

    if (deviceMaintenanceHistory.length === 0) {
      return notFoundResponse(res, 'No maintenance history found for this device');
    }

    return successResponse(res, deviceMaintenanceHistory, 'Device maintenance history retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get device maintenance history', 500);
  }
});

// ===========================================
// listIssues - 列出問題清單（可選 deviceId / assigned=me）
// ===========================================
router.get('/issues', async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId ? Number(req.query.deviceId) : null;
    const assignedMe = req.query.assigned === 'me';

    // 這裡使用你現有的 camelCase 欄位命名（對應 drizzle schema）
    // issues: id, deviceId, description, issuer, assigner, status, createTime
    // devices: id, name
    // users:   id, name
    const q = db
      .select({
        id: issues.id,
        deviceId: issues.deviceId,
        description: issues.description,
        status: issues.status,              // '1' | '2' | '3'
        createTime: issues.createTime,
        assignerId: issues.assigner,        // ★ 注意是 assigner，不是 assignee
        assignerName: users.name,           // 目前用「指派人」名稱當作清單欄位（先頂著）
        deviceName: devices.name
      })
      .from(issues)
      .leftJoin(devices, eq(issues.deviceId, devices.id))
      .leftJoin(users, eq(issues.assigner, users.id))   // ★ 這裡也用 assigner
      .orderBy(desc(issues.createTime));

    let rows = await q;

    if (deviceId) {
      rows = rows.filter(r => r.deviceId === deviceId);
    }

    if (assignedMe) {
      if (!req.user) {
        return errorResponse(res, 'User not authenticated', 401);
      }
      rows = rows.filter(r => r.assignerId === req.user!.id);
    }

    return successResponse(res, rows, 'Issues retrieved successfully');
  } catch (error) {
    console.error('[GET /api/devices/issues] error:', error);
    return errorResponse(res, 'Failed to get issues', 500);
  }
});

// ===========================================
// 7. 獲取特定設備資訊
// ===========================================
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

// ===========================================
// 8. 更新設備狀態
// ===========================================
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const id = parseInt(req.params['id'] || '0');
    // 1. 數據驗證
    const validatedData = updateDeviceStatusSchema.parse(req.body);
    const { status } = validatedData;

    // 更新設備狀態
    const [updatedDevice] = await db
      .update(devices)
      .set({
        status,
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



// ===========================================
// 9. 獲取維護統計
// ===========================================
router.get('/maintenance/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await db
      .select({
        totalMaintenance: sql<number>`count(${maintenanceRecords.id})`,
        totalDevices: sql<number>`count(distinct ${devices.id})`,
        totalIssues: sql<number>`count(${issues.id})`
      })
      .from(maintenanceRecords)
      .crossJoin(devices)
      .crossJoin(issues);

    return successResponse(res, stats[0], 'Maintenance statistics retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get maintenance statistics', 500);
  }
});

export default router;
