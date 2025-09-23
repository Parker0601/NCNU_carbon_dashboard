import { Router } from 'express';
import authRoutes from './auth.routes';
import carbonRoutes from './carbon.routes';
import carbonCalculationsRoutes from './carbon-calculations.routes';
import adminRoutes from './admin.routes';
import scrapRoutes from './scrap.routes';
import deviceRoutes from './device.routes';
import { navRouter } from './nav.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/carbon', carbonRoutes);
router.use('/carbon-calculations', carbonCalculationsRoutes);
router.use('/admin', adminRoutes);
router.use('/devices', deviceRoutes);
router.use('/nav', navRouter);
router.use('/scrap', scrapRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router; 