import { Router } from 'express';
import { merchantRepository } from '../repositories/merchant.repository.js';
import { merchantVerificationService } from '../services/merchantVerification.service.js';

const router = Router();

router.get('/merchants', async (req, res, next) => {
  try {
    const list = await merchantRepository.getAll();
    res.json({
      success: true,
      data: list,
      merchants: list
    });
  } catch (err) {
    next(err);
  }
});

router.post('/merchants/verify-domain', async (req, res, next) => {
  try {
    const { domain, name } = req.body || {};
    const evalRes = merchantVerificationService.evaluateMerchant({
      merchantName: name || domain,
      listingUrl: domain
    });
    res.json({
      success: true,
      data: evalRes,
      verification: evalRes
    });
  } catch (err) {
    next(err);
  }
});

export default router;

