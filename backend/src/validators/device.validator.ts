import { z } from 'zod';

// 設備問題回報驗證
export const reportIssueSchema = z.object({
  deviceId: z.coerce.number().int().positive('Device ID must be a positive integer'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
});

// 維修紀錄驗證
export const maintenanceRecordSchema = z.object({
  deviceId: z.coerce.number().int().positive('Device ID must be a positive integer'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  endTime: z.string().datetime('End time must be a valid datetime'),
});

// 設備狀態更新驗證
export const updateDeviceStatusSchema = z.object({
  status: z.enum(['1', '2', '3'], {
    errorMap: () => ({ message: 'Status must be 1, 2, or 3' })
  }),
});

// 設備查詢參數驗證
export const deviceQuerySchema = z.object({
  status: z.enum(['1', '2', '3']).optional(),
  name: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

// 維護歷史查詢參數驗證
export const maintenanceHistoryQuerySchema = z.object({
  deviceId: z.coerce.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type ReportIssueInput = z.infer<typeof reportIssueSchema>;
export type MaintenanceRecordInput = z.infer<typeof maintenanceRecordSchema>;
export type UpdateDeviceStatusInput = z.infer<typeof updateDeviceStatusSchema>;
export type DeviceQueryInput = z.infer<typeof deviceQuerySchema>;
export type MaintenanceHistoryQueryInput = z.infer<typeof maintenanceHistoryQuerySchema>;
