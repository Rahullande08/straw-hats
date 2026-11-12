import { passportService } from '../services/passport.service.js';

export class PassportController {
  async getPassports(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const passports = await passportService.getPassports(userId);
      res.json({
        success: true,
        data: passports,
        passports
      });
    } catch (err) {
      next(err);
    }
  }

  async createPassport(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const passport = await passportService.createPassport({
        userId,
        ...req.body
      });
      res.status(201).json({
        success: true,
        data: passport,
        passport,
        message: 'Agent passport minted with cryptographic key'
      });
    } catch (err) {
      next(err);
    }
  }

  async revokePassport(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const updated = await passportService.revokePassport(req.params.id, userId);
      res.json({
        success: true,
        data: updated,
        passport: updated,
        message: `Agent passport status is now ${updated.status}`
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyMerchantToken(req, res, next) {
    try {
      const token = req.params.token;
      const result = await passportService.verifyMerchantToken(token);
      if (!result.verified) {
        return res.status(403).json(result);
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const passportController = new PassportController();
