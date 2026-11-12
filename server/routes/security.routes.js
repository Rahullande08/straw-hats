import { Router } from 'express';
import { securityController } from '../controllers/security.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';

const router = Router();

router.get('/security/attacks', securityController.getAttacks.bind(securityController));
router.post('/security/run-attacks', securityController.runAttacks.bind(securityController));
router.post('/security/check-message', validateBody(['message']), securityController.checkScamMessage.bind(securityController));
router.get('/security/kill-switch', securityController.getKillSwitch.bind(securityController));
router.post('/security/kill-switch/toggle', requireAuth, securityController.toggleKillSwitch.bind(securityController));
router.get('/security/verify-ledger', securityController.verifyAuditLedger.bind(securityController));

export default router;
