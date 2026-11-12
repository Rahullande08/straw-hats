import { Router } from 'express';
import { requestController } from '../controllers/request.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';

const router = Router();

router.get('/requests', requestController.getRequests.bind(requestController));
router.get('/requests/:id', requestController.getRequestById.bind(requestController));
router.post('/requests', requireAuth, validateBody(['itemTitle', 'amount', 'merchant']), requestController.createRequest.bind(requestController));
router.post('/requests/:id/approve', requireAuth, requestController.approveRequest.bind(requestController));
router.post('/requests/:id/reject', requireAuth, requestController.rejectRequest.bind(requestController));
router.post('/requests/:id/cancel', requireAuth, requestController.cancelRequest.bind(requestController));
router.get('/requests/:id/dispute-pack', requestController.getDisputePack.bind(requestController));

export default router;

