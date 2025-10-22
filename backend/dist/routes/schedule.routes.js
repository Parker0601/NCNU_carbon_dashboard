import { Router } from 'express';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { devices, issues, users, schedule, maintenanceRecords } from '@/db/schema';
import { authenticateToken, requireUser, requireAdmin } from '@/middleware/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/responses';
import { z } from 'zod';
const router = Router();
router.get('/health', async (_req, res) => {
    try {
        await db.select().from(users).limit(1);
        return successResponse(res, { status: 'ok', database: 'connected' }, 'Health check passed');
    }
    catch (error) {
        console.error('健康檢查失敗:', error);
        return errorResponse(res, 'Health check failed', 500, error?.message);
    }
});
router.use(authenticateToken);
router.use(requireUser);
const assignHumanResourceSchema = z.object({
    issueId: z.number().int().positive(),
    userId: z.number().int().positive(),
    endTime: z.string().datetime().optional()
});
router.get('/assign-human-resource', requireAdmin, async (_req, res) => {
    try {
        console.log('開始獲取人力資源指派資料...');
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
            .where(sql `${devices.status} IN ('2', '3', '4')`);
        console.log('異常設備數量:', faultyDevices.length);
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
            .where(eq(users.role, '1'));
        console.log('員工數量:', availableStaff.length);
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
            .where(eq(issues.status, '1'));
        console.log('問題記錄數量:', existingIssues.length);
        return successResponse(res, {
            faultyDevices,
            availableStaff,
            existingIssues
        }, 'Human resource assignment data retrieved successfully');
    }
    catch (error) {
        console.error('獲取人力資源指派資料錯誤:', error);
        return errorResponse(res, 'Failed to get human resource assignment data', 500, error?.message);
    }
});
router.post('/assign-human-resource', requireAdmin, async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        const { issueId, userId, endTime } = assignHumanResourceSchema.parse(req.body);
        const result = await db.transaction(async (tx) => {
            const [existingIssue] = await tx
                .select()
                .from(issues)
                .where(eq(issues.id, issueId));
            if (!existingIssue) {
                throw Object.assign(new Error('Issue not found'), { statusCode: 404 });
            }
            const [assignee] = await tx
                .select()
                .from(users)
                .where(and(eq(users.id, userId), eq(users.role, '1')));
            if (!assignee) {
                throw Object.assign(new Error('Invalid assignee or user is not a staff member'), { statusCode: 400 });
            }
            const [updatedIssue] = await tx
                .update(issues)
                .set({
                assigner: userId,
                status: '2'
            })
                .where(eq(issues.id, issueId))
                .returning();
            await tx
                .update(users)
                .set({ status: 'busy' })
                .where(eq(users.id, userId));
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
            await tx
                .update(devices)
                .set({ status: '4' })
                .where(eq(devices.id, existingIssue.deviceId));
            const [pendingMaintenance] = await tx
                .select({ id: maintenanceRecords.id })
                .from(maintenanceRecords)
                .where(and(eq(maintenanceRecords.issueId, issueId), eq(maintenanceRecords.userId, userId), sql `${maintenanceRecords.endTime} IS NULL`))
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
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return errorResponse(res, error.issues.map(i => i.message).join('; '), 400);
        }
        console.error('assign-human-resource error:', error?.message || error, error?.stack);
        const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return errorResponse(res, 'Failed to assign staff member', status, error?.message);
    }
});
router.get('/my-tasks', async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
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
    }
    catch (error) {
        return errorResponse(res, 'Failed to get my tasks', 500);
    }
});
router.patch('/accept-task/:scheduleId', async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        const scheduleId = parseInt(req.params['scheduleId']);
        if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
            return errorResponse(res, 'Invalid schedule id', 400);
        }
        const [existingSchedule] = await db
            .select()
            .from(schedule)
            .where(and(eq(schedule.id, scheduleId), eq(schedule.userId, req.user.id)));
        if (!existingSchedule) {
            return notFoundResponse(res, 'Schedule not found or not assigned to you');
        }
        if (existingSchedule.status !== 'assigned') {
            return errorResponse(res, 'Schedule is not in assigned status', 400);
        }
        const [updatedSchedule] = await db
            .update(schedule)
            .set({ status: 'accepted' })
            .where(eq(schedule.id, scheduleId))
            .returning();
        const deviceId = updatedSchedule.deviceId;
        await db.update(devices)
            .set({ status: '2' })
            .where(eq(devices.id, deviceId));
        await db.update(issues)
            .set({ status: '2' })
            .where(and(eq(issues.deviceId, deviceId), eq(issues.assigner, updatedSchedule.userId), eq(issues.status, '1')));
        return successResponse(res, {
            scheduleId: updatedSchedule.id,
            status: updatedSchedule.status,
            message: 'Task accepted successfully'
        }, 'Task accepted successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to accept task', 500);
    }
});
router.post('/maintenance', async (req, res) => {
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
        const [device] = await db
            .select()
            .from(devices)
            .where(eq(devices.id, deviceId));
        if (!device) {
            return notFoundResponse(res, 'Device not found');
        }
        const [existingIssue] = await db
            .select()
            .from(issues)
            .where(and(eq(issues.deviceId, deviceId), eq(issues.assigner, req.user.id)))
            .limit(1);
        if (!existingIssue) {
            return errorResponse(res, 'No assigned issue found for this device', 400);
        }
        const [updatedMaintenance] = await db
            .update(maintenanceRecords)
            .set({
            employeeDescription: employee_description,
            endTime: new Date(endTime)
        })
            .where(and(eq(maintenanceRecords.issueId, existingIssue.id), eq(maintenanceRecords.userId, req.user.id), sql `${maintenanceRecords.endTime} IS NULL`))
            .returning();
        if (!updatedMaintenance) {
            return errorResponse(res, 'No pending maintenance record to update', 400);
        }
        await db
            .update(users)
            .set({ status: 'idle' })
            .where(eq(users.id, req.user.id));
        await db
            .update(schedule)
            .set({
            status: 'submitted',
            endTime: new Date(endTime)
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
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return errorResponse(res, error.issues.map(i => i.message).join('; '), 400);
        }
        return errorResponse(res, 'Failed to create maintenance record', 500);
    }
});
router.get('/maintenance-history', async (req, res) => {
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
            .where(and(deviceId ? eq(devices.id, deviceId) : undefined, sql `${maintenanceRecords.endTime} IS NOT NULL`))
            .orderBy(desc(maintenanceRecords.createTime));
        return successResponse(res, history, 'Maintenance history retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get maintenance history', 500);
    }
});
router.get('/manager-view', requireAdmin, async (req, res) => {
    try {
        const fromStr = String(req.query.from || '');
        const toStr = String(req.query.to || '');
        let from = null;
        let to = null;
        if (fromStr) {
            const d = new Date(fromStr);
            if (!isNaN(+d))
                from = d;
        }
        if (toStr) {
            const d = new Date(toStr);
            if (!isNaN(+d))
                to = d;
        }
        if (!from || !to) {
            const now = new Date();
            const day = now.getDay() || 7;
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
            .where(and(gte(schedule.startTime, from), lte(schedule.startTime, to)))
            .orderBy(desc(schedule.startTime));
        return successResponse(res, list, 'Manager view schedule retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get manager view', 500);
    }
});
router.get('/pending-review', requireAdmin, async (_req, res) => {
    try {
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
            .leftJoin(maintenanceRecords, and(eq(maintenanceRecords.userId, schedule.userId), eq(maintenanceRecords.issueId, issues.id)))
            .where(and(eq(schedule.status, 'submitted'), sql `${maintenanceRecords.id} = (
          SELECT MAX(id) FROM maintenance_records 
          WHERE user_id = ${schedule.userId} 
          AND issue_id = ${issues.id}
        )`))
            .orderBy(desc(schedule.startTime));
        return successResponse(res, pendingReviews, 'Pending reviews retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get pending reviews', 500);
    }
});
router.patch('/review/:scheduleId', requireAdmin, async (req, res) => {
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
        const [existingSchedule] = await db
            .select()
            .from(schedule)
            .where(and(eq(schedule.id, scheduleId), eq(schedule.status, 'submitted')));
        if (!existingSchedule) {
            return notFoundResponse(res, 'Schedule not found or not in submitted status');
        }
        let newStatus;
        if (action === 'approve') {
            newStatus = 'approved';
        }
        else {
            newStatus = 'rejected';
        }
        if (boss_description && existingSchedule.deviceId) {
            const [relatedIssue] = await db
                .select({ id: issues.id })
                .from(issues)
                .where(and(eq(issues.deviceId, existingSchedule.deviceId), eq(issues.assigner, existingSchedule.userId)))
                .orderBy(desc(issues.createTime))
                .limit(1);
            if (relatedIssue) {
                const [latestMaintenance] = await db
                    .select({ id: maintenanceRecords.id })
                    .from(maintenanceRecords)
                    .where(and(eq(maintenanceRecords.issueId, relatedIssue.id), eq(maintenanceRecords.userId, existingSchedule.userId)))
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
        const [updatedSchedule] = await db
            .update(schedule)
            .set({
            status: newStatus
        })
            .where(eq(schedule.id, scheduleId))
            .returning();
        if (action === 'reject') {
            await db
                .update(users)
                .set({ status: 'busy' })
                .where(eq(users.id, existingSchedule.userId));
        }
        if (action === 'approve' && existingSchedule.deviceId) {
            await db
                .update(issues)
                .set({ status: '3' })
                .where(and(eq(issues.deviceId, existingSchedule.deviceId), eq(issues.assigner, existingSchedule.userId), eq(issues.status, '2')));
        }
        return successResponse(res, {
            scheduleId: updatedSchedule.id,
            status: updatedSchedule.status,
            endTime: updatedSchedule.endTime,
            action,
            message: `Task ${action}d successfully`
        }, `Task ${action}d successfully`);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return errorResponse(res, error.issues.map(i => i.message).join('; '), 400);
        }
        return errorResponse(res, 'Failed to review task', 500);
    }
});
export default router;
//# sourceMappingURL=schedule.routes.js.map