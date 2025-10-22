import { Router } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { devices, issues, maintenanceRecords, users } from '@/db/schema';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/responses';
import { authenticateToken, requireUser, requireAdmin } from '@/middleware/auth';
import { reportIssueSchema, maintenanceRecordSchema, updateDeviceStatusSchema } from '@/validators/device.validator';
const router = Router();
router.use(authenticateToken);
router.use(requireUser);
router.get('/', requireAdmin, async (_req, res) => {
    try {
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
    }
    catch (error) {
        return errorResponse(res, 'Failed to get devices', 500);
    }
});
router.get('/status', async (_req, res) => {
    try {
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
    }
    catch (error) {
        return errorResponse(res, 'Failed to get device status', 500);
    }
});
router.post('/report-issue', async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        const validatedData = reportIssueSchema.parse(req.body);
        const { deviceId, name, description } = validatedData;
        const [device] = await db
            .select()
            .from(devices)
            .where(eq(devices.id, deviceId));
        if (!device) {
            return notFoundResponse(res, 'Device not found');
        }
        const [newIssue] = await db
            .insert(issues)
            .values({
            deviceId: deviceId,
            description,
            issuer: req.user.id,
            assigner: req.user.id,
            status: '1',
            createTime: new Date()
        })
            .returning();
        await db
            .update(devices)
            .set({ status: '3' })
            .where(eq(devices.id, deviceId));
        return successResponse(res, {
            issueId: newIssue.id,
            deviceId: newIssue.deviceId,
            name,
            description: newIssue.description,
            status: newIssue.status,
            createTime: newIssue.createTime,
            employee: {
                id: req.user.id,
                name: req.user.name,
                role: req.user.role,
                email: req.user.email
            }
        }, 'Issue reported successfully', 201);
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResponse(res, error.message, 400);
        }
        return errorResponse(res, 'Failed to report issue', 500);
    }
});
router.post('/maintenance', async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        const validatedData = maintenanceRecordSchema.parse(req.body);
        const { deviceId, name, description, endTime } = validatedData;
        const [device] = await db
            .select()
            .from(devices)
            .where(eq(devices.id, deviceId));
        if (!device) {
            return notFoundResponse(res, 'Device not found');
        }
        let issueId = deviceId;
        const [existingIssue] = await db
            .select()
            .from(issues)
            .where(eq(issues.deviceId, deviceId))
            .limit(1);
        if (!existingIssue) {
            const [newIssue] = await db
                .insert(issues)
                .values({
                deviceId: deviceId,
                description: `維修記錄: ${description}`,
                issuer: req.user.id,
                assigner: null,
                status: '3',
                createTime: new Date()
            })
                .returning();
            issueId = newIssue.id;
        }
        else {
            await db
                .update(issues)
                .set({
                status: '3',
                description: `維修完成: ${description}`
            })
                .where(eq(issues.id, existingIssue.id));
            issueId = existingIssue.id;
        }
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
            employee: {
                id: req.user.id,
                name: req.user.name,
                role: req.user.role,
                email: req.user.email
            }
        }, 'Maintenance record created successfully', 201);
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResponse(res, error.message, 400);
        }
        return errorResponse(res, 'Failed to create maintenance record', 500);
    }
});
router.get('/maintenance-history', async (_req, res) => {
    try {
        const maintenanceHistory = await db
            .select({
            deviceId: devices.id,
            deviceStatus: devices.status,
            deviceName: devices.name,
            runRatio: devices.ratio,
            runTime: devices.bootTime,
            recordId: maintenanceRecords.id,
            recordDescription: maintenanceRecords.description,
            recordCreateTime: maintenanceRecords.createTime,
            recordEndTime: maintenanceRecords.endTime,
            userName: users.name
        })
            .from(maintenanceRecords)
            .innerJoin(issues, eq(maintenanceRecords.issueId, issues.id))
            .innerJoin(devices, eq(issues.deviceId, devices.id))
            .innerJoin(users, eq(maintenanceRecords.userId, users.id))
            .orderBy(desc(maintenanceRecords.createTime));
        return successResponse(res, maintenanceHistory, 'Maintenance history retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get maintenance history', 500);
    }
});
router.get('/:id/maintenance', async (req, res) => {
    try {
        const deviceId = parseInt(req.params['id'] || '0');
        const deviceMaintenanceHistory = await db
            .select({
            deviceId: devices.id,
            deviceStatus: devices.status,
            deviceName: devices.name,
            runRatio: devices.ratio,
            runTime: devices.bootTime,
            recordId: maintenanceRecords.id,
            recordDescription: maintenanceRecords.description,
            recordCreateTime: maintenanceRecords.createTime,
            recordEndTime: maintenanceRecords.endTime,
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
    }
    catch (error) {
        return errorResponse(res, 'Failed to get device maintenance history', 500);
    }
});
router.get('/issues', async (req, res) => {
    try {
        const deviceId = req.query.deviceId ? Number(req.query.deviceId) : null;
        const assignedMe = req.query.assigned === 'me';
        const q = db
            .select({
            id: issues.id,
            deviceId: issues.deviceId,
            description: issues.description,
            status: issues.status,
            createTime: issues.createTime,
            assignerId: issues.assigner,
            assignerName: users.name,
            deviceName: devices.name
        })
            .from(issues)
            .leftJoin(devices, eq(issues.deviceId, devices.id))
            .leftJoin(users, eq(issues.assigner, users.id))
            .orderBy(desc(issues.createTime));
        let rows = await q;
        if (deviceId) {
            rows = rows.filter(r => r.deviceId === deviceId);
        }
        if (assignedMe) {
            if (!req.user) {
                return errorResponse(res, 'User not authenticated', 401);
            }
            rows = rows.filter(r => r.assignerId === req.user.id);
        }
        return successResponse(res, rows, 'Issues retrieved successfully');
    }
    catch (error) {
        console.error('[GET /api/devices/issues] error:', error);
        return errorResponse(res, 'Failed to get issues', 500);
    }
});
router.get('/:id', async (req, res) => {
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
    }
    catch (error) {
        return errorResponse(res, 'Failed to get device', 500);
    }
});
router.put('/:id/status', async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        const id = parseInt(req.params['id'] || '0');
        const validatedData = updateDeviceStatusSchema.parse(req.body);
        const { status } = validatedData;
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
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResponse(res, error.message, 400);
        }
        return errorResponse(res, 'Failed to update device status', 500);
    }
});
router.get('/maintenance/stats', async (_req, res) => {
    try {
        const stats = await db
            .select({
            totalMaintenance: sql `count(${maintenanceRecords.id})`,
            totalDevices: sql `count(distinct ${devices.id})`,
            totalIssues: sql `count(${issues.id})`
        })
            .from(maintenanceRecords)
            .crossJoin(devices)
            .crossJoin(issues);
        return successResponse(res, stats[0], 'Maintenance statistics retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get maintenance statistics', 500);
    }
});
export default router;
//# sourceMappingURL=device.routes.js.map