import { BadRequestError } from '../utils/errors.js';

export function validateBody(requiredFields = []) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return next(new BadRequestError('Malformed request: JSON body required'));
    }

    const missing = requiredFields.filter(
      field => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
    );

    if (missing.length > 0) {
      return next(new BadRequestError(`Missing required field(s): ${missing.join(', ')}`));
    }

    next();
  };
}

/**
 * Formula injection prevention for CSV exports
 */
export function sanitizeCsvField(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);

  // Redact potential full secrets/keys
  if (str.startsWith('0x') && str.length > 20) {
    str = str.slice(0, 10) + '...[REDACTED]';
  }
  if (str.includes('ed25519:') && str.length > 20) {
    str = 'ed25519:...[REDACTED]';
  }

  // Formula injection prevention: =, +, -, @, \t, \r
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some(prefix => str.startsWith(prefix))) {
    str = `'` + str;
  }

  // Escape double quotes and enclose in quotes if contains comma, quote, or newline
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function exportToSafeCsv(headers, rows) {
  const headerLine = headers.map(h => sanitizeCsvField(h.label || h)).join(',');
  const rowLines = rows.map(row => {
    return headers.map(h => {
      const key = h.key || h;
      return sanitizeCsvField(row[key]);
    }).join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}

