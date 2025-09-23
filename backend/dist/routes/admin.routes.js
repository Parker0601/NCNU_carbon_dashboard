import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { carbon } from '@/db/schema';
import { successResponse, errorResponse } from '@/utils/responses';
import { authenticateToken, requireReviewer } from '@/middleware/auth';
const router = Router();
router.use(authenticateToken);
router.use(requireReviewer);
router.get('/all-carbon-data', async (_req, res) => {
    try {
        const allData = await db
            .select()
            .from(carbon);
        return successResponse(res, allData, 'All carbon data retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get carbon data', 500);
    }
});
router.get('/user-carbon-data/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params['userId'] || '0');
        const userData = await db
            .select()
            .from(carbon)
            .where(eq(carbon.userId, userId));
        return successResponse(res, userData, 'User carbon data retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get user carbon data', 500);
    }
});
router.get('/carbon-stats', async (_req, res) => {
    try {
        const totalRecords = await db.select().from(carbon);
        const stats = {
            totalRecords: totalRecords.length,
            totalConsumption: totalRecords.reduce((sum, record) => sum + (record.consumption || 0), 0),
            totalElectricity: totalRecords.reduce((sum, record) => sum + (record.electricity || 0), 0),
        };
        return successResponse(res, stats, 'Carbon statistics retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get carbon statistics', 500);
    }
});
export default router;
//# sourceMappingURL=admin.routes.js.map