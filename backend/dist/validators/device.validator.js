import { z } from 'zod';
export const reportIssueSchema = z.object({
    deviceId: z.coerce.number().int().positive('Device ID must be a positive integer'),
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
});
export const maintenanceRecordSchema = z.object({
    deviceId: z.coerce.number().int().positive('Device ID must be a positive integer'),
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
    endTime: z.string().datetime('End time must be a valid datetime'),
});
export const updateDeviceStatusSchema = z.object({
    status: z.enum(['1', '2', '3'], {
        errorMap: () => ({ message: 'Status must be 1, 2, or 3' })
    }),
});
export const deviceQuerySchema = z.object({
    status: z.enum(['1', '2', '3']).optional(),
    name: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(50),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
});
export const maintenanceHistoryQuerySchema = z.object({
    deviceId: z.coerce.number().int().positive().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().positive().max(100).optional().default(50),
    offset: z.coerce.number().int().nonnegative().optional().default(0),
});
//# sourceMappingURL=device.validator.js.map