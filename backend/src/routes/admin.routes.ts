import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { carbon, carbonCalculations, users } from '@/db/schema';
import { successResponse, errorResponse } from '@/utils/responses';
import { authenticateToken, requireReviewer } from '@/middleware/auth';

const router = Router();

// All routes require authentication and reviewer/admin role
router.use(authenticateToken);
router.use(requireReviewer);

// Get all carbon data (admin view)
router.get('/all-carbon-data', async (_req: Request, res: Response) => {
  try {
    // 查找所有碳排資料
    const allData = await db
      .select()
      .from(carbon);

    return successResponse(res, allData, 'All carbon data retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get carbon data', 500);
  }
});

// Get carbon data by user ID
router.get('/user-carbon-data/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params['userId'] || '0');
    
    // 查找特定用戶的碳排計算資料
    const userData = await db
      .select({
        id: carbonCalculations.id,
        userId: carbonCalculations.userId,
        fuelName: carbonCalculations.fuelName,
        consumption: carbonCalculations.consumption,
        unit: carbonCalculations.unit,
        totalEmission: carbonCalculations.totalEmission,
        calculationDate: carbonCalculations.calculationDate,
        createdAt: carbonCalculations.createdAt,
        notes: carbonCalculations.notes,
        userName: users.name
      })
      .from(carbonCalculations)
      .leftJoin(users, eq(carbonCalculations.userId, users.id))
      .where(eq(carbonCalculations.userId, userId));
    
    return successResponse(res, userData, 'User carbon data retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get user carbon data', 500);
  }
});

// Get carbon data statistics
router.get('/carbon-stats', async (_req: Request, res: Response) => {
  try {
    // 獲取統計資料
    const totalRecords = await db.select().from(carbonCalculations);
    
    const stats = {
      totalRecords: totalRecords.length,
      totalConsumption: totalRecords.reduce((sum, record) => sum + (record.consumption || 0), 0),
      totalEmission: totalRecords.reduce((sum, record) => sum + (record.totalEmission || 0), 0),
    };
    
    return successResponse(res, stats, 'Carbon statistics retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to get carbon statistics', 500);
  }
});

export default router; 