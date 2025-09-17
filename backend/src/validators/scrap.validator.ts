import { z } from 'zod';

// status uses enum '1' | '2' | '3' as defined in schema
export const createScrapDataSchema = z.object({
  deviceId: z.coerce.number().int().positive('deviceId must be a positive integer'),
  type: z.string().min(1, 'type is required').max(255),
  status: z.enum(['1', '2', '3']),
  humidity: z.coerce.number().int().min(0),
  weight: z.coerce.number().int().min(0),
  volume: z.coerce.number().int().min(0),
});

export const updateScrapDataSchema = createScrapDataSchema.partial();

export type CreateScrapDataInput = z.infer<typeof createScrapDataSchema>;
export type UpdateScrapDataInput = z.infer<typeof updateScrapDataSchema>;


