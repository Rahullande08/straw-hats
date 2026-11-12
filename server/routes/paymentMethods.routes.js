import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';

const router = Router();

router.get('/payment-methods', paymentController.getPaymentMethods.bind(paymentController));
router.post('/payment-methods/connect', requireAuth, validateBody(['name', 'type']), paymentController.connectPaymentRail.bind(paymentController));
router.post('/payment-methods/:id/toggle-freeze', requireAuth, paymentController.toggleFreeze.bind(paymentController));
router.post('/payment-methods/:id/limits', requireAuth, paymentController.updateLimits.bind(paymentController));

export default router;

