import express from 'express';
// import { authenticateToken } from '../middleware/auth';
import { validateWasteData, validateWasteUpdate } from '../validators/waste.validator';
import { 
  getAllWaste, 
  getWasteById, 
  createWaste, 
  updateWaste, 
  deleteWaste,
  getWasteStatistics 
} from '../controllers/waste.controller';

const router = express.Router();

// 暫時移除認證，方便測試
// router.use(authenticateToken);

// 獲取所有廢棄物資料
router.get('/', getAllWaste);

// 獲取廢棄物統計資料
router.get('/statistics', getWasteStatistics);

// 根據 ID 獲取特定廢棄物資料
router.get('/:id', getWasteById);

// 新增廢棄物資料
router.post('/', validateWasteData, createWaste);

// 更新廢棄物資料
router.put('/:id', validateWasteUpdate, updateWaste);

// 刪除廢棄物資料
router.delete('/:id', deleteWaste);

export default router; 