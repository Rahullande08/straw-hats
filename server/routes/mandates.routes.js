import { Router } from 'express';
import { mandateController } from '../controllers/mandate.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';

const router = Router();

router.get('/mandates', mandateController.getMandates.bind(mandateController));
router.get('/mandates/:id', mandateController.getMandateById.bind(mandateController));
router.post('/mandates', requireAuth, validateBody(['name', 'budgetCeiling']), mandateController.createMandate.bind(mandateController));
router.put('/mandates/:id', requireAuth, mandateController.updateMandate.bind(mandateController));
router.patch('/mandates/:id/status', requireAuth, mandateController.updateStatus.bind(mandateController));
router.post('/mandates/:id/revoke', requireAuth, mandateController.revokeMandate.bind(mandateController));

export default router;

