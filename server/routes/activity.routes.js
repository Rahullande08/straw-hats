import { Router } from 'express';
import { activityController } from '../controllers/activity.controller.js';

const router = Router();

router.get('/activity', activityController.getActivity.bind(activityController));
router.get('/activity/export', activityController.exportActivity.bind(activityController));

export default router;
