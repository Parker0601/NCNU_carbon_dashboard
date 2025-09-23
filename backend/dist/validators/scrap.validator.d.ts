import { z } from 'zod';
export declare const createScrapDataSchema: z.ZodObject<{
    deviceId: z.ZodNumber;
    type: z.ZodString;
    status: z.ZodEnum<["1", "2", "3"]>;
    humidity: z.ZodNumber;
    weight: z.ZodNumber;
    volume: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: "1" | "2" | "3";
    deviceId: number;
    humidity: number;
    weight: number;
    volume: number;
}, {
    type: string;
    status: "1" | "2" | "3";
    deviceId: number;
    humidity: number;
    weight: number;
    volume: number;
}>;
export declare const updateScrapDataSchema: z.ZodObject<{
    deviceId: z.ZodOptional<z.ZodNumber>;
    type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["1", "2", "3"]>>;
    humidity: z.ZodOptional<z.ZodNumber>;
    weight: z.ZodOptional<z.ZodNumber>;
    volume: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: string | undefined;
    status?: "1" | "2" | "3" | undefined;
    deviceId?: number | undefined;
    humidity?: number | undefined;
    weight?: number | undefined;
    volume?: number | undefined;
}, {
    type?: string | undefined;
    status?: "1" | "2" | "3" | undefined;
    deviceId?: number | undefined;
    humidity?: number | undefined;
    weight?: number | undefined;
    volume?: number | undefined;
}>;
export type CreateScrapDataInput = z.infer<typeof createScrapDataSchema>;
export type UpdateScrapDataInput = z.infer<typeof updateScrapDataSchema>;
//# sourceMappingURL=scrap.validator.d.ts.map