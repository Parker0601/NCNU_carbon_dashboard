import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { carbon } from '@/db/schema';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/responses';
import { createCarbonDataSchema, updateCarbonDataSchema } from '@/validators/carbon.validator';
import { authenticateToken, requireUser } from '@/middleware/auth';
const router = Router();
router.use(authenticateToken);
router.use(requireUser);
router.post('/', async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        const validatedData = createCarbonDataSchema.parse(req.body);
        const [newData] = await db
            .insert(carbon)
            .values({
            userId: req.user.id,
            fuelName: validatedData.fuelName,
            consumption: validatedData.consumption,
            electricity: validatedData.electricity,
            coefficient: validatedData.coefficient,
        })
            .returning();
        return successResponse(res, newData, 'Carbon data created successfully', 201);
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResponse(res, error.message, 400);
        }
        return errorResponse(res, 'Failed to create carbon data', 500);
    }
});
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params['id'] || '0');
        const [data] = await db
            .select()
            .from(carbon)
            .where(eq(carbon.id, id));
        if (!data) {
            return notFoundResponse(res, 'Carbon data not found');
        }
        return successResponse(res, data, 'Carbon data retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get carbon data', 500);
    }
});
router.get('/my-data', async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        const data = await db
            .select()
            .from(carbon)
            .where(eq(carbon.userId, req.user.id))
            .orderBy(desc(carbon.id));
        return successResponse(res, data, 'Carbon data retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to get carbon data', 500);
    }
});
router.put('/:id', async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        const id = parseInt(req.params['id'] || '0');
        const validatedData = updateCarbonDataSchema.parse(req.body);
        const [updatedData] = await db
            .update(carbon)
            .set({
            fuelName: validatedData.fuelName,
            consumption: validatedData.consumption,
            electricity: validatedData.electricity,
            coefficient: validatedData.coefficient,
        })
            .where(and(eq(carbon.id, id), eq(carbon.userId, req.user.id)))
            .returning();
        if (!updatedData) {
            return notFoundResponse(res, 'Carbon data not found or not authorized');
        }
        return successResponse(res, updatedData, 'Carbon data updated successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return errorResponse(res, error.message, 400);
        }
        return errorResponse(res, 'Failed to update carbon data', 500);
    }
});
router.delete('/:id', async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, 'User not authenticated', 401);
        }
        const id = parseInt(req.params['id'] || '0');
        const [deletedData] = await db
            .delete(carbon)
            .where(and(eq(carbon.id, id), eq(carbon.userId, req.user.id)))
            .returning();
        if (!deletedData) {
            return notFoundResponse(res, 'Carbon data not found or not authorized');
        }
        return successResponse(res, null, 'Carbon data deleted successfully');
    }
    catch (error) {
        return errorResponse(res, 'Failed to delete carbon data', 500);
    }
});
export default router;
//# sourceMappingURL=carbon.routes.js.map