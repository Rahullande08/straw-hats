import { Router } from 'express';
import { agentController } from '../controllers/agent.controller.js';
import { aiProcurementLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';

const router = Router();

router.post('/agent/parse-brief', aiProcurementLimiter, validateBody(['prompt']), agentController.parseBrief.bind(agentController));
router.post('/agent/evaluate-candidates', aiProcurementLimiter, agentController.evaluateCandidates.bind(agentController));
router.post('/agent/search', aiProcurementLimiter, agentController.search.bind(agentController));

export default router;
