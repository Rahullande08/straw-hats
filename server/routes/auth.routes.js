import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/session', authController.getSession.bind(authController));
router.post('/login', authLimiter, authController.login.bind(authController));
router.post('/register', authLimiter, authController.register.bind(authController));
router.post('/logout', requireAuth, authController.logout.bind(authController));

export default router;
