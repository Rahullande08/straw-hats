import { Router } from 'express';
import { passportController } from '../controllers/passport.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';

const router = Router();

router.get('/passports', passportController.getPassports.bind(passportController));
router.get('/passports/:id', requireAuth, passportController.getPassportById.bind(passportController));
router.post('/passports', requireAuth, validateBody(['agentName']), passportController.createPassport.bind(passportController));
router.post('/passports/:id/revoke', requireAuth, passportController.revokePassport.bind(passportController));
router.get('/passports/verify/:token', passportController.verifyMerchantToken.bind(passportController));

export default router;

