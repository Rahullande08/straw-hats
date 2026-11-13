import { idempotencyRepository } from '../repositories/idempotency.repository.js';
import { hashToken } from '../utils/crypto.js';

export function idempotencyMiddleware() {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!key || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    try {
      const existing = await idempotencyRepository.getByKey(key);
      if (existing) {
        if (existing.status === 'COMPLETED' && existing.response_body) {
          res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
          return res.status(existing.response_code || 200).json(existing.response_body);
        }
        if (existing.status === 'PROCESSING') {
          return res.status(409).json({
            success: false,
            code: 'IDEMPOTENT_REPLAY_IN_FLIGHT',
            error: 'A request with this Idempotency-Key is currently processing. Please retry shortly.'
          });
        }
      }

      // Hash request body for integrity
      const bodyStr = JSON.stringify(req.body || {});
      const reqHash = hashToken(bodyStr);

      await idempotencyRepository.create({
        key,
        userId: req.user?.id || null,
        requestPath: req.originalUrl || req.url,
        requestHash: reqHash
      });

      // Intercept res.json to capture and cache completed response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        const statusCode = res.statusCode || 200;
        if (statusCode >= 200 && statusCode < 300) {
          idempotencyRepository.complete({
            key,
            responseCode: statusCode,
            responseBody: body
          }).catch(() => {});
        } else {
          idempotencyRepository.fail({
            key,
            responseCode: statusCode,
            responseBody: body
          }).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      // If idempotency check encounters an error, proceed rather than halting request
      next();
    }
  };
}

