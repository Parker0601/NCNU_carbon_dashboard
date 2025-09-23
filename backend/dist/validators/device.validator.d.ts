import { z } from 'zod';
export declare const reportIssueSchema: z.ZodObject<{
    deviceId: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    deviceId: number;
    description: string;
}, {
    name: string;
    deviceId: number;
    description: string;
}>;
export declare const maintenanceRecordSchema: z.ZodObject<{
    deviceId: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodString;
    endTime: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    deviceId: number;
    description: string;
    endTime: string;
}, {
    name: string;
    deviceId: number;
    description: string;
    endTime: string;
}>;
export declare const updateDeviceStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["1", "2", "3"]>;
}, "strip", z.ZodTypeAny, {
    status: "1" | "2" | "3";
}, {
    status: "1" | "2" | "3";
}>;
export declare const deviceQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["1", "2", "3"]>>;
    name: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    status?: "1" | "2" | "3" | undefined;
    name?: string | undefined;
}, {
    status?: "1" | "2" | "3" | undefined;
    name?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export declare const maintenanceHistoryQuerySchema: z.ZodObject<{
    deviceId: z.ZodOptional<z.ZodNumber>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    deviceId?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    deviceId?: number | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type ReportIssueInput = z.infer<typeof reportIssueSchema>;
export type MaintenanceRecordInput = z.infer<typeof maintenanceRecordSchema>;
export type UpdateDeviceStatusInput = z.infer<typeof updateDeviceStatusSchema>;
export type DeviceQueryInput = z.infer<typeof deviceQuerySchema>;
export type MaintenanceHistoryQueryInput = z.infer<typeof maintenanceHistoryQuerySchema>;
//# sourceMappingURL=device.validator.d.ts.map