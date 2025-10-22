import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST = path.join(__dirname, '../../../FRONTEND/dist');
router.get('/waste_management', (_req, res) => {
    res.sendFile(path.join(DIST, 'waste_management.html'));
});
router.get('/waste_input', (_req, res) => {
    res.sendFile(path.join(DIST, 'waste_input.html'));
});
router.get('/my_scraps', (_req, res) => {
    res.sendFile(path.join(DIST, 'my_scraps.html'));
});
router.get('/scrap_edit', (_req, res) => {
    res.sendFile(path.join(DIST, 'scrap_edit.html'));
});
router.get('/scrap_overview', (_req, res) => {
    res.sendFile(path.join(DIST, 'scrap_overview.html'));
});
export default router;
//# sourceMappingURL=pages.routes.js.map