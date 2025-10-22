import { Router } from 'express';
import authRoutes from './auth.routes';
import carbonRoutes from './carbon.routes';
import scrapRoutes from './scrap.routes';
import deviceRoutes from './device.routes';
import { navRouter } from './nav.routes';
import scheduleRoutes from './schedule.routes';
const router = Router();
router.use('/auth', authRoutes);
router.use('/carbon', carbonRoutes);
router.use('/devices', deviceRoutes);
router.use('/nav', navRouter);
router.use('/scrap', scrapRoutes);
router.use('/schedule', scheduleRoutes);
router.get('/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
export default router;
//# sourceMappingURL=index.js.map