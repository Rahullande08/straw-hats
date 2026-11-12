import crypto from 'crypto';

export function requestIdMiddleware(req, res, next) {
  const reqId = req.headers['x-request-id'] || `req_${crypto.randomBytes(12).toString('hex')}`;
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}

