import { z } from 'zod';
import { validateRequest } from '../middleware/validate';

// 廢棄物資料驗證 schema
export const wasteDataSchema = z.object({
  waste_type: z.string().min(1, '廢棄物類型不能為空'),
  quantity: z.number().positive('數量必須為正數'),
  unit: z.string().min(1, '單位不能為空'),
  disposal_method: z.string().min(1, '處理方式不能為空'),
  disposal_date: z.string().datetime('日期格式不正確'),
  location: z.string().min(1, '地點不能為空'),
  responsible_person: z.string().min(1, '負責人不能為空'),
  cost: z.number().min(0, '成本不能為負數').optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).default('pending')
});

// 更新廢棄物資料驗證 schema
export const wasteUpdateSchema = wasteDataSchema.partial();

// 驗證中間件
export const validateWasteData = validateRequest(wasteDataSchema);
export const validateWasteUpdate = validateRequest(wasteUpdateSchema);

// 查詢參數驗證
export const wasteQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  waste_type: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
});

export const validateWasteQuery = validateRequest(wasteQuerySchema, 'query'); 