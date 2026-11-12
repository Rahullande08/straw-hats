import { settingsRepository } from '../repositories/settings.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';

export class SettingsController {
  async getSettings(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const settings = await settingsRepository.getAllForUser(userId);

      // Default baseline settings
      const baseline = {
        defaultAutoApproveLimit: 3000,
        requireCoSignerThreshold: 8000,
        hardMandateCap: 150000,
        autoRevokeOnAnomaly: true,
        strictQuoteVerification: true,
        paypalSandboxMode: true,
        paypalClientId: 'BAAv88201...99XJ',
        paypalSecretConfigured: true,
        webhookEndpoint: 'https://gateway.internal.sovereign/v1/webhook',
        notificationsEmail: 'elena.vance@sovereign-vault.internal',
        coSignerEmail: 'family-co-signer@vault.internal',
        networkNodeId: 'node-us-east-sgx-01',
        currency: 'INR',
        nodeMode: 'sandbox'
      };

      const merged = { ...baseline, ...settings };
      res.json({
        success: true,
        data: merged,
        settings: merged
      });
    } catch (err) {
      next(err);
    }
  }

  async saveSettings(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      await settingsRepository.saveMultiple(userId, req.body || {});

      await auditRepository.createLog({
        userId,
        actorType: 'USER',
        actorId: userId,
        eventType: 'SETTINGS_UPDATED',
        entityType: 'SETTINGS',
        entityId: 'arbitration_settings',
        action: 'UPDATE_SETTINGS',
        outcome: 'SUCCESS',
        summary: 'Gateway arbitration settings updated.',
        amount: 'Configuration',
        meta: 'Persisted to Sovereign secure node'
      });

      const updated = await settingsRepository.getAllForUser(userId);
      res.json({
        success: true,
        data: updated,
        settings: updated,
        message: 'Settings saved successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

export const settingsController = new SettingsController();
