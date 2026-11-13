import { procurementService } from '../services/procurement.service.js';

export class AgentController {
  async parseBrief(req, res, next) {
    try {
      const { prompt } = req.body || {};
      const result = await procurementService.parseBrief(prompt);
      res.json({
        success: true,
        data: result,
        prompt: result.prompt,
        structuredBrief: result.structuredBrief,
        activeMandateApplied: result.activeMandateApplied
      });
    } catch (err) {
      next(err);
    }
  }

  evaluateCandidates(req, res, next) {
    try {
      const { brief } = req.body || {};
      const result = procurementService.evaluateCandidates(brief);
      res.json({
        success: true,
        data: result,
        totalScanned: result.totalScanned,
        eligibleCount: result.eligibleCount,
        rejectedCount: result.rejectedCount,
        candidates: result.candidates
      });
    } catch (err) {
      next(err);
    }
  }

  search(req, res, next) {
    try {
      const { prompt } = req.body || {};
      const result = procurementService.evaluateCandidates({ prompt });
      res.json({
        success: true,
        data: result.candidates,
        candidates: result.candidates,
        totalFound: result.totalScanned
      });
    } catch (err) {
      next(err);
    }
  }
}

export const agentController = new AgentController();

