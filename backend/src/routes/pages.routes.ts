import { Router, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.join(__dirname, '../../../FRONTEND/dist');

// 可選：如果你堅持頁面也要驗證，再把 authenticateToken/requireUser 加回來
router.get('/waste_management', (_req: Request, res: Response) => {
  res.sendFile(path.join(DIST, 'waste_management.html'));
});

router.get('/waste_input', (_req: Request, res: Response) => {
  res.sendFile(path.join(DIST, 'waste_input.html'));
});

export default router;
