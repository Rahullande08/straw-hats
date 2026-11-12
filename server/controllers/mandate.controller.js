import { mandateService } from '../services/mandate.service.js';

export class MandateController {
  async getMandates(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const mandates = await mandateService.getMandates(userId);
      res.json({
        success: true,
        data: mandates,
        mandates
      });
    } catch (err) {
      next(err);
    }
  }

  async getMandateById(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const mandate = await mandateService.getMandateById(req.params.id, userId);
      res.json({
        success: true,
        data: mandate,
        mandate
      });
    } catch (err) {
      next(err);
    }
  }

  async createMandate(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const mandate = await mandateService.createMandate({
        userId,
        ...req.body
      });
      res.status(201).json({
        success: true,
        data: mandate,
        mandate,
        message: 'Spending mandate created successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMandate(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const updated = await mandateService.updateMandate(req.params.id, userId, req.body);
      res.json({
        success: true,
        data: updated,
        mandate: updated,
        message: 'Mandate updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async revokeMandate(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const mandate = await mandateService.toggleRevoke(req.params.id, userId);
      res.json({
        success: true,
        data: mandate,
        mandate,
        message: `Mandate #${mandate.id} status is now ${mandate.status}`
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const mandate = await mandateService.updateStatus(req.params.id, userId, req.body?.status);
      res.json({
        success: true,
        data: mandate,
        mandate,
        message: `Mandate #${mandate.id} status is now ${mandate.status}`
      });
    } catch (err) {
      next(err);
    }
  }
}

export const mandateController = new MandateController();

