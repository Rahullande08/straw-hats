import { paymentService } from '../services/payment.service.js';

export class PaymentController {
  async getPaymentMethods(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const methods = await paymentService.getPaymentMethods(userId);
      res.json({
        success: true,
        data: methods,
        paymentMethods: methods
      });
    } catch (err) {
      next(err);
    }
  }

  async connectPaymentRail(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const rail = await paymentService.connectPaymentRail({
        userId,
        ...req.body
      });
      res.status(201).json({
        success: true,
        data: rail,
        paymentMethod: rail,
        message: 'Sandbox payment rail connected successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleFreeze(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const updated = await paymentService.toggleFreeze(req.params.id, userId);
      res.json({
        success: true,
        data: updated,
        paymentMethod: updated,
        message: `Payment method is now ${updated.status}`
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLimits(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const updated = await paymentService.updateLimits(req.params.id, userId, req.body);
      res.json({
        success: true,
        data: updated,
        paymentMethod: updated,
        message: 'Payment limits updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();
