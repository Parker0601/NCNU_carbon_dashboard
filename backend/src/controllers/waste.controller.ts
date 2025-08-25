import { Request, Response } from 'express';
import { db } from '../db';
import { waste } from '../db/schema';
import { eq, desc, and, gte, lte, like } from 'drizzle-orm';
import { sendSuccess, sendError } from '../utils/responses';

// 獲取所有廢棄物資料
export const getAllWaste = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, waste_type, status, start_date, end_date } = req.query;
    
    // 建立查詢條件
    const conditions = [];
    if (waste_type) conditions.push(like(waste.waste_type, `%${waste_type}%`));
    if (status) conditions.push(eq(waste.status, status as string));
    if (start_date) conditions.push(gte(waste.disposal_date, new Date(start_date as string)));
    if (end_date) conditions.push(lte(waste.disposal_date, new Date(end_date as string)));

    const offset = (Number(page) - 1) * Number(limit);
    
    // 執行查詢
    const wasteData = await db
      .select()
      .from(waste)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(waste.created_at))
      .limit(Number(limit))
      .offset(offset);

    // 獲取總數
    const totalCount = await db
      .select({ count: waste.id })
      .from(waste)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return sendSuccess(res, {
      data: wasteData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / Number(limit))
      }
    }, '廢棄物資料獲取成功');
  } catch (error) {
    return sendError(res, '獲取廢棄物資料失敗', error);
  }
};

// 根據 ID 獲取特定廢棄物資料
export const getWasteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const wasteData = await db
      .select()
      .from(waste)
      .where(eq(waste.id, Number(id)))
      .limit(1);

    if (wasteData.length === 0) {
      return sendError(res, '廢棄物資料不存在', null, 404);
    }

    return sendSuccess(res, wasteData[0], '廢棄物資料獲取成功');
  } catch (error) {
    return sendError(res, '獲取廢棄物資料失敗', error);
  }
};

// 新增廢棄物資料
export const createWaste = async (req: Request, res: Response) => {
  try {
    const wasteData = req.body;
    
    const newWaste = await db
      .insert(waste)
      .values({
        ...wasteData,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    return sendSuccess(res, newWaste[0], '廢棄物資料新增成功', 201);
  } catch (error) {
    return sendError(res, '新增廢棄物資料失敗', error);
  }
};

// 更新廢棄物資料
export const updateWaste = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedWaste = await db
      .update(waste)
      .set({
        ...updateData,
        updated_at: new Date()
      })
      .where(eq(waste.id, Number(id)))
      .returning();

    if (updatedWaste.length === 0) {
      return sendError(res, '廢棄物資料不存在', null, 404);
    }

    return sendSuccess(res, updatedWaste[0], '廢棄物資料更新成功');
  } catch (error) {
    return sendError(res, '更新廢棄物資料失敗', error);
  }
};

// 刪除廢棄物資料
export const deleteWaste = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const deletedWaste = await db
      .delete(waste)
      .where(eq(waste.id, Number(id)))
      .returning();

    if (deletedWaste.length === 0) {
      return sendError(res, '廢棄物資料不存在', null, 404);
    }

    return sendSuccess(res, null, '廢棄物資料刪除成功');
  } catch (error) {
    return sendError(res, '刪除廢棄物資料失敗', error);
  }
};

// 獲取廢棄物統計資料
export const getWasteStatistics = async (_req: Request, res: Response) => {
  try {
    // 獲取各狀態的數量統計
    const statusStats = await db
      .select({
        status: waste.status,
        count: waste.id
      })
      .from(waste)
      .groupBy(waste.status);

    // 獲取各類型的數量統計
    const typeStats = await db
      .select({
        waste_type: waste.waste_type,
        count: waste.id
      })
      .from(waste)
      .groupBy(waste.waste_type);

    // 獲取總成本統計
    const costStats = await db
      .select({
        total_cost: waste.cost
      })
      .from(waste)
      .where(eq(waste.status, 'completed'));

    const totalCost = costStats.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);

    return sendSuccess(res, {
      status_statistics: statusStats,
      type_statistics: typeStats,
      total_cost: totalCost
    }, '統計資料獲取成功');
  } catch (error) {
    return sendError(res, '獲取統計資料失敗', error);
  }
}; 