import { Router } from 'express';
import { paymentRepository } from '../repositories/payment.repository.js';
import { payPalService } from '../services/paypal.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/payments/orders', requireAuth, async (req, res, next) => {
  try {
    const status = payPalService.getStatus();
    res.json({
      success: true,
      data: status,
      paypalConfig: status
    });
  } catch (err) {
    next(err);
  }
});

router.get('/payments/:id', requireAuth, async (req, res, next) => {
  try {
    const payment = await paymentRepository.getPaymentByRequestId(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }
    res.json({
      success: true,
      data: payment,
      payment
    });
  } catch (err) {
    next(err);
  }
});

router.post('/payments/webhook', async (req, res) => {
  // Webhook event receiver
  res.json({ received: true, status: 'PROCESSED' });
});

export default router;
