import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/dashboard', dashboardController.getDashboard.bind(dashboardController));

export default router;
