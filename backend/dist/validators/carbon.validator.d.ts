import { z } from 'zod';
export declare const createCarbonDataSchema: z.ZodObject<{
    fuelName: z.ZodString;
    consumption: z.ZodNumber;
    electricity: z.ZodOptional<z.ZodNumber>;
    coefficient: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    consumption: number;
    fuelName: string;
    coefficient: number;
    electricity?: number | undefined;
}, {
    consumption: number;
    fuelName: string;
    coefficient: number;
    electricity?: number | undefined;
}>;
export declare const updateCarbonDataSchema: z.ZodObject<{
    fuelName: z.ZodOptional<z.ZodString>;
    consumption: z.ZodOptional<z.ZodNumber>;
    electricity: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    coefficient: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    consumption?: number | undefined;
    fuelName?: string | undefined;
    electricity?: number | undefined;
    coefficient?: number | undefined;
}, {
    consumption?: number | undefined;
    fuelName?: string | undefined;
    electricity?: number | undefined;
    coefficient?: number | undefined;
}>;
export declare const carbonDataQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    limit: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    limit?: string | undefined;
    page?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export type CreateCarbonDataInput = z.infer<typeof createCarbonDataSchema>;
export type UpdateCarbonDataInput = z.infer<typeof updateCarbonDataSchema>;
export type CarbonDataQueryInput = z.infer<typeof carbonDataQuerySchema>;
//# sourceMappingURL=carbon.validator.d.ts.map