
/**
 * ========================================
 * Schedule Routes - 維修排程與任務管理 API
 * ========================================
 * 
 * 此模組負責管理設備維修的完整工作流程，包含：
 * 1. 主管指派員工處理設備問題
 * 2. 員工接受任務並提交維修記錄
 * 3. 主管審核維修報告
 * 
 * 完整工作流程：
 * 1. 主管指派 (POST /assign-human-resource) 
 *    → schedule.status = 'assigned', employee.status = 'busy'
 * 
 * 2. 員工接受任務 (PATCH /accept-task/:scheduleId)
 *    → schedule.status = 'accepted'
 * 
 * 3. 員工提交維修 (POST /maintenance)
 *    → schedule.status = 'submitted', schedule.endTime = 維修結束時間
 *    → employee.status = 'idle', issues.status 保持不變
 * 
 * 4. 主管審核 (PATCH /review/:scheduleId)
 *    - 通過: schedule.status = 'approved', issues.status = '3' (已解決)
 *    - 退回: schedule.status = 'rejected', employee.status = 'busy' (重新處理)
 * 
 * Schedule 狀態說明：
 * - assigned: 指派未接受
 * - accepted: 指派已接受
 * - submitted: 送出審核
 * - approved: 已過審
 * - rejected: 已退回
 */

import { Router, Request, Response } from 'express';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { devices, issues, users, schedule, maintenanceRecords } from '@/db/schema';
import { authenticateToken, requireUser, requireAdmin } from '@/middleware/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/responses';
import { z } from 'zod';

const router = Router();

// 健康檢查路由（不需要登入）
router.get('/health', async (_req: Request, res: Response) => {
  try {
    // 測試資料庫連線
    await db.select().from(users).limit(1);
    return successResponse(res, { status: 'ok', database: 'connected' }, 'Health check passed');
  } catch (error: any) {
    console.error('健康檢查失敗:', error);
    return errorResponse(res, 'Health check failed', 500, error?.message);
  }
});

// 所有 schedule 相關路由需登入
router.use(authenticateToken);
router.use(requireUser);

// 驗證 schema
const assignHumanResourceSchema = z.object({
  issueId: z.number().int().positive(),
  userId: z.number().int().positive(),
  endTime: z.string().datetime().optional()
});

// ===========================================
// GET /api/schedule/assign-human-resource - 主管查看故障設備和可指派員工
// ===========================================
/**
 * 功能：主管查看人力資源指派頁面所需的資料
 * 權限：僅主管 (role=2) 可訪問
 * 
 * 回傳資料：
 * 1. faultyDevices: 所有異常設備清單 (device_status = '2', '3', '4')
 *    - '2': 維護中
 *    - '3': 故障
 *    - '4': 已指派未處理
 * 2. availableStaff: 所有員工清單 (role = '1')，包含員工狀態 (idle/busy)
 * 3. existingIssues: 所有待處理的問題清單 (issue_status = '1')
 * 
 * 使用場景：主管進入人力指派頁面時，查看哪些設備異常、哪些員工可用
 */
router.get('/assign-human-resource', requireAdmin, async (_req: Request, res: Response) => {
  try {
    console.log('開始獲取人力資源指派資料...');
    
    // 1. 獲取異常設備 (device_status = '2', '3', '4')
    console.log('查詢異常設備...');
    const faultyDevices = await db
      .select({
        deviceId: devices.id,
        deviceName: devices.name,
        deviceStatus: devices.status,
        bootTime: devices.bootTime,
        ratio: devices.ratio
      })
      .from(devices)
      .where(sql`${devices.status} IN ('2', '3', '4')`)
    
    console.log('異常設備數量:', faultyDevices.length);

    // 2. 獲取所有員工 (role = '1') 及其狀態
    console.log('查詢員工資料...');
    const availableStaff = await db
      .select({
        userId: users.id,
        userName: users.name,
        userRole: users.role,
        userStatus: users.status,
        mail: users.mail
      })
      .from(users)
      .where(eq(users.role, '1'))
    
    console.log('員工數量:', availableStaff.length);

    // 3. 獲取現有的問題記錄（包含指派人資訊）
    console.log('查詢問題記錄...');
    const existingIssues = await db
      .select({
        issueId: issues.id,
        deviceId: issues.deviceId,
        description: issues.description,
        status: issues.status,
        assignerId: issues.assigner,
        assignerName: users.name,
        createTime: issues.createTime
      })
      .from(issues)
      .leftJoin(users, eq(issues.assigner, users.id))
      .where(eq(issues.status, '1'))
    
    console.log('問題記錄數量:', existingIssues.length);

    return successResponse(res, {
      faultyDevices,
      availableStaff,
      existingIssues
    }, 'Human resource assignment data retrieved successfully');
  } catch (error: any) {
    console.error('獲取人力資源指派資料錯誤:', error);
    return errorResponse(res, 'Failed to get human resource assignment data', 500, error?.message);
  }
});

// ===========================================
// POST /api/schedule/assign-human-resource - 主管指派員工處理設備問題
// ===========================================
/**
 * 功能：主管指派員工去處理特定的設備問題
 * 權限：僅主管 (role=2) 可訪問
 * 
 * 請求參數 (Body):
 * - issueId: 問題 ID
 * - userId: 被指派的員工 ID
 * 
 * 執行動作：
 * 1. 更新 issue 的 assigner 和 status (改為 '2' 處理中)
 * 2. 更新員工狀態為 'busy'
 * 3. 創建 schedule 記錄，status 為 'assigned'，endTime 為 null
 * 
 * 使用場景：主管選擇某個問題和員工，點擊指派按鈕
 */
router.post('/assign-human-resource', requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const { issueId, userId, endTime } = assignHumanResourceSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      // 檢查問題是否存在
      const [existingIssue] = await tx
        .select()
        .from(issues)
        .where(eq(issues.id, issueId));

      if (!existingIssue) {
        throw Object.assign(new Error('Issue not found'), { statusCode: 404 });
      }

      // 檢查指派員工是否存在且為一般員工
      const [assignee] = await tx
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.role, '1')))

      if (!assignee) {
        throw Object.assign(new Error('Invalid assignee or user is not a staff member'), { statusCode: 400 });
      }

      // 更新問題的 assigner
      const [updatedIssue] = await tx
        .update(issues)
        .set({
          assigner: userId,
          status: '2' // 2: 處理中
        })
        .where(eq(issues.id, issueId))
        .returning();

      // 更新員工狀態為忙碌
      await tx
        .update(users)
        .set({ status: 'busy' })
        .where(eq(users.id, userId));

      // 創建 schedule 記錄
      const [newSchedule] = await tx
        .insert(schedule)
        .values({
          userId: userId,
          deviceId: existingIssue.deviceId,
          title: `維修任務 - ${existingIssue.description}`,
          description: `指派處理設備問題: ${existingIssue.description}`,
          date: new Date().toISOString().split('T')[0],
          startTime: new Date(),
          endTime: endTime ? new Date(endTime) : null,
          status: 'assigned'
        })
        .returning();

      // 更新設備狀態為「已指派未處理」
      await tx
        .update(devices)
        .set({ status: '4' }) // 4: 已指派未處理
        .where(eq(devices.id, existingIssue.deviceId));

      // 在指派時建立對應的維修記錄（先寫入 user_id 與 create_time，其他欄位之後補）
      // 若已存在未結束的紀錄則不重複建立
      const [pendingMaintenance] = await tx
        .select({ id: maintenanceRecords.id })
        .from(maintenanceRecords)
        .where(and(
          eq(maintenanceRecords.issueId, issueId),
          eq(maintenanceRecords.userId, userId),
          sql`${maintenanceRecords.endTime} IS NULL`
        ))
        .limit(1);

      if (!pendingMaintenance) {
        await tx
          .insert(maintenanceRecords)
          .values({
            issueId,
            userId: userId,
            createTime: new Date()
          });
      }

      return {
        issueId: updatedIssue.id,
        assignerId: updatedIssue.assigner,
        status: updatedIssue.status,
        scheduleId: newSchedule.id,
      };
    });

    return successResponse(res, { ...result, message: 'Staff member assigned successfully' }, 'Staff member assigned to issue successfully', 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, error.issues.map(i => i.message).join('; '), 400);
    }
    // 紀錄詳細錯誤以利排查
    console.error('assign-human-resource error:', error?.message || error, error?.stack);
    const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    return errorResponse(res, 'Failed to assign staff member', status, error?.message);
  }
});

// ===========================================
// GET /api/schedule/my-tasks - 員工查看自己的工作任務
// ===========================================
/**
 * 功能：員工查看自己被指派的所有工作任務和問題
 * 權限：所有登入用戶可訪問
 * 
 * 回傳資料：
 * 1. schedules: 員工的所有 schedule 記錄（包含 assigned/accepted/submitted/approved/rejected 狀態）
 * 2. issues: 員工被指派的所有問題記錄
 * 
 * 使用場景：
 * - 員工登入後查看自己的待辦任務
 * - 查看被退回 (rejected) 的任務，需要重新提交維修
 */
router.get('/my-tasks', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    // 獲取員工的 schedule 任務
    const mySchedules = await db
      .select({
        scheduleId: schedule.id,
        title: schedule.title,
        description: schedule.description,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: schedule.status,
        deviceId: schedule.deviceId,
        deviceName: devices.name
      })
      .from(schedule)
      .leftJoin(devices, eq(schedule.deviceId, devices.id))
      .where(eq(schedule.userId, req.user.id))
      .orderBy(desc(schedule.startTime));

    // 獲取員工被指派的問題
    const myIssues = await db
      .select({
        issueId: issues.id,
        deviceId: issues.deviceId,
        description: issues.description,
        status: issues.status,
        createTime: issues.createTime,
        deviceName: devices.name
      })
      .from(issues)
      .leftJoin(devices, eq(issues.deviceId, devices.id))
      .where(eq(issues.assigner, req.user.id))
      .orderBy(desc(issues.createTime));

    return successResponse(res, {
      schedules: mySchedules,
      issues: myIssues
    }, 'My tasks retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get my tasks', 500);
  }
});

// ===========================================
// PATCH /api/schedule/accept-task/:scheduleId - 員工接受任務
// ===========================================
/**
 * 功能：員工接受主管指派的任務
 * 權限：所有登入用戶可訪問
 * 
 * 請求參數 (URL):
 * - scheduleId: schedule 記錄的 ID
 * 
 * 執行動作：
 * - 將 schedule.status 從 'assigned' 改為 'accepted'
 * 
 * 使用場景：員工看到主管指派的新任務後，點擊「接受任務」按鈕
 */
router.patch('/accept-task/:scheduleId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const scheduleId = parseInt(req.params['scheduleId']);
    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return errorResponse(res, 'Invalid schedule id', 400);
    }

    // 檢查 schedule 是否存在且屬於該員工
    const [existingSchedule] = await db
      .select()
      .from(schedule)
      .where(and(eq(schedule.id, scheduleId), eq(schedule.userId, req.user.id)));

    if (!existingSchedule) {
      return notFoundResponse(res, 'Schedule not found or not assigned to you');
    }

    if (!['assigned', 'rejected'].includes(existingSchedule.status)) {
      return errorResponse(res, 'Schedule is not in a receivable status', 400);
    }

    // 更新 schedule 狀態為 accepted
    const [updatedSchedule] = await db
      .update(schedule)
      .set({ status: 'accepted' })
      .where(eq(schedule.id, scheduleId))
      .returning();

    // 取得剛才更新到的 schedule（內含 deviceId, userId）
    const deviceId = updatedSchedule.deviceId!;

// 把設備狀態改成維護中 (2)
    await db.update(devices)
      .set({ status: '2' })
      .where(eq(devices.id, deviceId));

// 把該員工在該設備的「待處理」issue 改為「處理中」
// （如果你一台設備只有一筆 active issue，也可以不加 assigner 條件）
    await db.update(issues)
      .set({ status: '2' })
      .where(and(
        eq(issues.deviceId, deviceId),
        eq(issues.assigner, updatedSchedule.userId),
        eq(issues.status, '1') // 待處理 → 處理中
      ));


    return successResponse(res, {
      scheduleId: updatedSchedule.id,
      status: updatedSchedule.status,
      message: 'Task accepted successfully'
    }, 'Task accepted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to accept task', 500);
  }
});

// ===========================================
// POST /api/schedule/maintenance - 員工提交維修記錄
// ===========================================
/**
 * 功能：員工完成維修後，提交維修記錄
 * 權限：所有登入用戶可訪問
 * 
 * 請求參數 (Body):
 * - deviceId: 設備 ID
 * - employee_description: 維修描述（員工回報）
 * - endTime: 維修結束時間
 * 
 * 執行動作：
 * 1. 創建 maintenanceRecords 記錄
 * 2. 更新員工狀態為 'idle'
 * 3. 更新 schedule.status 為 'submitted'，schedule.endTime 設定為維修結束時間
 * 4. issues.status 保持不變（等主管審核通過後才改為 '3' 已解決）
 * 
 * 使用場景：
 * - 員工完成維修工作後，填寫維修報告並提交
 * - 被退回 (rejected) 的任務，重新提交維修記錄
 */
router.post('/maintenance', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const maintenanceSchema = z.object({
      deviceId: z.number().int().positive(),
      employee_description: z.string().min(1),
      endTime: z.string()
    });

    const { deviceId, employee_description, endTime } = maintenanceSchema.parse(req.body);

    // 檢查設備是否存在
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId));

    if (!device) {
      return notFoundResponse(res, 'Device not found');
    }

    // 檢查是否有相關的 issue
    const [existingIssue] = await db
      .select()
      .from(issues)
      .where(and(eq(issues.deviceId, deviceId), eq(issues.assigner, req.user.id)))
      .limit(1);

    if (!existingIssue) {
      return errorResponse(res, 'No assigned issue found for this device', 400);
    }

    // 更新既有的維修記錄（在指派時建立），補上員工描述與結束時間
    const [updatedMaintenance] = await db
      .update(maintenanceRecords)
      .set({
        employeeDescription: employee_description,
        endTime: new Date(endTime)
      })
      .where(and(
        eq(maintenanceRecords.issueId, existingIssue.id),
        eq(maintenanceRecords.userId, req.user.id),
        // 僅更新尚未結束的那一筆
        sql`${maintenanceRecords.endTime} IS NULL`
      ))
      .returning();

    if (!updatedMaintenance) {
      return errorResponse(res, 'No pending maintenance record to update', 400);
    }

    // 不更新 issue 狀態，等主管審核通過後才更新

    // 更新員工狀態為空閒
    await db
      .update(users)
      .set({ status: 'idle' })
      .where(eq(users.id, req.user.id));

    // 更新相關的 schedule 狀態和結束時間
    await db
      .update(schedule)
      .set({ 
        status: 'submitted',
        endTime: new Date(endTime) // 設定為維修結束時間
      })
      .where(and(eq(schedule.userId, req.user.id), eq(schedule.deviceId, deviceId)));

    return successResponse(res, {
      maintenanceId: updatedMaintenance.id,
      deviceId,
      employeeDescription: updatedMaintenance.employeeDescription,
      createTime: updatedMaintenance.createTime,
      endTime: updatedMaintenance.endTime,
      message: 'Maintenance record updated successfully'
    }, 'Maintenance record updated successfully', 200);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, error.issues.map(i => i.message).join('; '), 400);
    }
    return errorResponse(res, 'Failed to create maintenance record', 500);
  }
});

// ===========================================
// GET /api/schedule/maintenance-history - 查詢維修歷史記錄
// ===========================================
/**
 * 功能：查詢維修歷史記錄
 * 權限：所有登入用戶可訪問
 * 
 * 請求參數 (Query):
 * - deviceId (可選): 設備 ID，如果提供則只顯示該設備的維修歷史
 * 
 * 回傳資料：
 * - 所有維修記錄，包含設備名稱、維修描述、維修時間、維修人員等資訊
 * 
 * 使用場景：查看特定設備或所有設備的維修歷史
 */
router.get('/maintenance-history', async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId ? Number(req.query.deviceId) : null;

    const history = await db
      .select({
        maintenanceId: maintenanceRecords.id,
        deviceId: devices.id,
        deviceName: devices.name,
        deviceStatus: devices.status,
        employeeDescription: maintenanceRecords.employeeDescription,
        createTime: maintenanceRecords.createTime,
        endTime: maintenanceRecords.endTime,
        userName: users.name
      })
      .from(maintenanceRecords)
      .innerJoin(issues, eq(maintenanceRecords.issueId, issues.id))
      .innerJoin(devices, eq(issues.deviceId, devices.id))
      .innerJoin(users, eq(maintenanceRecords.userId, users.id))
      .where(and(
        deviceId ? eq(devices.id, deviceId) : undefined,
        sql`${maintenanceRecords.endTime} IS NOT NULL`
      ))
      .orderBy(desc(maintenanceRecords.createTime));

    return successResponse(res, history, 'Maintenance history retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get maintenance history', 500);
  }
});

// ===========================================
// GET /api/schedule/manager-view - 主管檢視周排程
// ===========================================
/**
 * 功能：依時間區間列出排程，供主管審核頁面載入
 * 權限：僅主管 (role=2) 可訪問
 * Query:
 * - from: ISO 字串（含時區）
 * - to:   ISO 字串（含時區）
 * 回傳：{ data: Array<{ id, title, startTime, endTime, userName, deviceName, description, status }> }
 */
router.get('/manager-view', requireAdmin, async (req: Request, res: Response) => {
  try {
    const fromStr = String(req.query.from || '');
    const toStr = String(req.query.to || '');

    let from: Date | null = null;
    let to: Date | null = null;
    if (fromStr) {
      const d = new Date(fromStr);
      if (!isNaN(+d)) from = d;
    }
    if (toStr) {
      const d = new Date(toStr);
      if (!isNaN(+d)) to = d;
    }

    // 無效參數則以「本週一 00:00 ~ 下週一 00:00」為預設
    if (!from || !to) {
      const now = new Date();
      const day = now.getDay() || 7; // 周日視為 7
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day - 1));
      monday.setHours(0, 0, 0, 0);
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      from = monday;
      to = nextMonday;
    }

    const list = await db
      .select({
        id: schedule.id,
        title: schedule.title,
        description: schedule.description,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: schedule.status,
        userName: users.name,
        deviceName: devices.name
      })
      .from(schedule)
      .leftJoin(users, eq(schedule.userId, users.id))
      .leftJoin(devices, eq(schedule.deviceId, devices.id))
      .where(and(
        gte(schedule.startTime, from!),
        lte(schedule.startTime, to!)
      ))
      .orderBy(desc(schedule.startTime));

    return successResponse(res, list, 'Manager view schedule retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get manager view', 500);
  }
});

// ===========================================
// GET /api/schedule/pending-review - 主管查看待審核的維修
// ===========================================
/**
 * 功能：主管查看所有待審核的維修記錄
 * 權限：僅主管 (role=2) 可訪問
 * 
 * 回傳資料：
 * - 所有 schedule.status = 'submitted' 的記錄
 * - 包含員工名稱、設備名稱、維修記錄等詳細資訊
 * - 只顯示最新的維修記錄（避免被退回的舊記錄重複出現）
 * 
 * 使用場景：主管進入審核頁面，查看需要審核的維修報告
 * 
 * 注意：退回 (rejected) 的維修記錄不會出現在此列表中，
 *      員工重新提交後會創建新的維修記錄並再次出現
 */
router.get('/pending-review', requireAdmin, async (_req: Request, res: Response) => {
  try {
    // 獲取狀態為 submitted 的 schedule 及其相關資訊
    const pendingReviews = await db
      .select({
        scheduleId: schedule.id,
        userId: schedule.userId,
        deviceId: schedule.deviceId,
        title: schedule.title,
        description: schedule.description,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: schedule.status,
        userName: users.name,
        deviceName: devices.name,
        maintenanceId: maintenanceRecords.id,
        maintenanceDescription: maintenanceRecords.employeeDescription,
        maintenanceCreateTime: maintenanceRecords.createTime,
        maintenanceEndTime: maintenanceRecords.endTime
      })
      .from(schedule)
      .leftJoin(users, eq(schedule.userId, users.id))
      .leftJoin(devices, eq(schedule.deviceId, devices.id))
      .leftJoin(issues, eq(issues.deviceId, schedule.deviceId))
      .leftJoin(maintenanceRecords, and(
        eq(maintenanceRecords.userId, schedule.userId),
        eq(maintenanceRecords.issueId, issues.id)
      ))
      .where(and(
        eq(schedule.status, 'submitted'),
        // 只顯示最新的維修記錄（按 createTime 排序取最新的）
        sql`${maintenanceRecords.id} = (
          SELECT MAX(id) FROM maintenance_records 
          WHERE user_id = ${schedule.userId} 
          AND issue_id = ${issues.id}
        )`
      ))
      .orderBy(desc(schedule.startTime));

    return successResponse(res, pendingReviews, 'Pending reviews retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get pending reviews', 500);
  }
});

// ===========================================
// PATCH /api/schedule/review/:scheduleId - 主管審核維修報告
// ===========================================
/**
 * 功能：主管審核員工提交的維修報告
 * 權限：僅主管 (role=2) 可訪問
 * 
 * 請求參數 (URL):
 * - scheduleId: schedule 記錄的 ID
 * 
  * 請求參數 (Body):
  * - action: 'approve' (通過) 或 'reject' (退回)
  * - boss_description (可選): 老闆對此次維修的回饋
 * 
 * 執行動作 (action = 'approve' 通過):
 * 1. 更新 schedule.status 為 'approved'
 * 2. 更新 issues.status 為 '3' (已解決)
 * 3. schedule.endTime 保持不變（維修完成時已設定）
 * 
 * 執行動作 (action = 'reject' 退回):
 * 1. 更新 schedule.status 為 'rejected'
 * 2. 更新員工狀態為 'busy'（需要重新處理）
 * 3. issues.status 保持 '2' (處理中)
 * 
 * 使用場景：主管查看維修報告後，決定通過或退回
 */
router.patch('/review/:scheduleId', requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const scheduleId = parseInt(req.params['scheduleId']);
    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return errorResponse(res, 'Invalid schedule id', 400);
    }

  const reviewSchema = z.object({
      action: z.enum(['approve', 'reject']),
      boss_description: z.string().optional()
    });

    const { action, boss_description } = reviewSchema.parse(req.body);

    // 檢查 schedule 是否存在且狀態為 submitted
    const [existingSchedule] = await db
      .select()
      .from(schedule)
      .where(and(eq(schedule.id, scheduleId), eq(schedule.status, 'submitted')));

    if (!existingSchedule) {
      return notFoundResponse(res, 'Schedule not found or not in submitted status');
    }

    let newStatus: 'approved' | 'rejected';

    if (action === 'approve') {
      newStatus = 'approved';
    } else {
      newStatus = 'rejected';
    }

    // 如有提供老闆回饋，更新最新一筆對應的 maintenance 記錄
    if (boss_description && existingSchedule.deviceId) {
      // 尋找對應的 issue（由裝置與被指派者組合）
      const [relatedIssue] = await db
        .select({ id: issues.id })
        .from(issues)
        .where(and(
          eq(issues.deviceId, existingSchedule.deviceId),
          eq(issues.assigner, existingSchedule.userId)
        ))
        .orderBy(desc(issues.createTime))
        .limit(1);

      if (relatedIssue) {
        // 取得最新一筆維修記錄 id
        const [latestMaintenance] = await db
          .select({ id: maintenanceRecords.id })
          .from(maintenanceRecords)
          .where(and(
            eq(maintenanceRecords.issueId, relatedIssue.id),
            eq(maintenanceRecords.userId, existingSchedule.userId)
          ))
          .orderBy(desc(maintenanceRecords.id))
          .limit(1);

        if (latestMaintenance) {
          await db
            .update(maintenanceRecords)
            .set({ bossDescription: boss_description })
            .where(eq(maintenanceRecords.id, latestMaintenance.id));
        }
      }
    }

    // 更新 schedule 狀態
    const [updatedSchedule] = await db
      .update(schedule)
      .set({ 
        status: newStatus
        // endTime 保持不變，因為在 maintenance 時已經設定
      })
      .where(eq(schedule.id, scheduleId))
      .returning();

    // 如果是退回，需要將員工狀態改回 busy（重新處理）
    if (action === 'reject') {
      await db
        .update(users)
        .set({ status: 'busy' })
        .where(eq(users.id, existingSchedule.userId));
    }

    // 如果是審核通過，更新對應的 issue 狀態為已解決
    if (action === 'approve' && existingSchedule.deviceId) {
      // 找到對應的 issue 並更新狀態
      await db
        .update(issues)
        .set({ status: '3' }) // 3: 已解決
        .where(and(
          eq(issues.deviceId, existingSchedule.deviceId),
          eq(issues.assigner, existingSchedule.userId),
          eq(issues.status, '2') // 只更新處理中的 issue
        ));
    }

    return successResponse(res, {
      scheduleId: updatedSchedule.id,
      status: updatedSchedule.status,
      endTime: updatedSchedule.endTime,
      action,
      message: `Task ${action}d successfully`
    }, `Task ${action}d successfully`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, error.issues.map(i => i.message).join('; '), 400);
    }
    return errorResponse(res, 'Failed to review task', 500);
  }
});

export default router;