import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/settings', settingsController.getSettings.bind(settingsController));
router.post('/settings', requireAuth, settingsController.saveSettings.bind(settingsController));

export default router;
