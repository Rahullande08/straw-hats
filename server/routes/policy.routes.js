import { Router } from 'express';
import { policyService } from '../services/policy.service.js';
import { mandateRepository } from '../repositories/mandate.repository.js';
import { passportRepository } from '../repositories/passport.repository.js';
import { killSwitchService } from '../services/killSwitch.service.js';

const router = Router();

router.post('/policy/evaluate', async (req, res, next) => {
  try {
    const { request: purchaseReq, mandateId } = req.body || {};
    if (!purchaseReq) {
      return res.status(400).json({ success: false, error: 'request payload is required' });
    }

    const userId = req.user?.id || 'usr_elena_vance';

    // Find target mandate
    let targetMandate = null;
    const targetId = mandateId || purchaseReq.mandateId;
    if (targetId) {
      targetMandate = await mandateRepository.findById(targetId);
    }
    if (!targetMandate) {
      const all = await mandateRepository.findAllByUserId(userId);
      targetMandate = all[0] || null;
    }

    const [killSwitch, passports] = await Promise.all([
      killSwitchService.getStatus(),
      passportRepository.findAllByUserId(userId)
    ]);

    const evalResult = policyService.evaluate({
      request: purchaseReq,
      mandate: targetMandate,
      systemState: {
        emergencyKillSwitchActive: killSwitch.active,
        agentPassports: passports
      }
    });

    res.json({
      success: true,
      data: evalResult,
      evaluation: evalResult
    });
  } catch (err) {
    next(err);
  }
});

export default router;
