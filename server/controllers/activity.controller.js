import { auditService } from '../services/audit.service.js';

export class ActivityController {
  async getActivity(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);
      const eventType = req.query.type || null;

      const activity = await auditService.getLogs({ userId, limit, offset, eventType });
      res.json({
        success: true,
        data: activity,
        activity
      });
    } catch (err) {
      next(err);
    }
  }

  async exportActivity(req, res, next) {
    try {
      const format = (req.query.format || 'json').toLowerCase();
      const userId = req.user?.id || 'usr_elena_vance';

      const file = await auditService.exportLogs({ format, userId });

      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.data);
    } catch (err) {
      next(err);
    }
  }
}

export const activityController = new ActivityController();

