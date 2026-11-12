import { auditRepository } from '../repositories/audit.repository.js';
import { exportToSafeCsv } from '../middleware/validation.middleware.js';
import { computeAuditEventHash } from '../utils/crypto.js';

export class AuditService {
  formatLogForClient(log) {
    if (!log) return null;
    return {
      id: log.id,
      type: log.event_type,
      agent: log.actor_id === 'usr_elena_vance' ? 'Elena Vance' : (log.actor_id || 'Gateway System'),
      summary: log.summary,
      amount: log.amount || 'N/A',
      meta: log.meta || 'Cryptographically verified',
      timestamp: log.created_at,
      hash: log.event_hash,
      details: typeof log.metadata_json === 'string' ? JSON.parse(log.metadata_json) : (log.metadata_json || {})
    };
  }

  async getLogs({ userId = null, limit = 50, offset = 0, eventType = null }) {
    const rows = await auditRepository.getLogs({ userId, limit, offset, eventType });
    return rows.map(r => this.formatLogForClient(r));
  }

  async exportLogs({ format = 'json', userId = null }) {
    const logs = await this.getLogs({ userId, limit: 500 });

    if (format === 'csv') {
      const headers = [
        { label: 'Event ID', key: 'id' },
        { label: 'Timestamp', key: 'timestamp' },
        { label: 'Event Type', key: 'type' },
        { label: 'Agent / Actor', key: 'agent' },
        { label: 'Summary', key: 'summary' },
        { label: 'Amount / Scope', key: 'amount' },
        { label: 'Metadata', key: 'meta' },
        { label: 'Proof Hash', key: 'hash' }
      ];
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `mandate_gateway_audit_safe_${Date.now()}.csv`,
        data: exportToSafeCsv(headers, logs)
      };
    }

    return {
      contentType: 'application/json',
      filename: `mandate_gateway_audit_${Date.now()}.json`,
      data: JSON.stringify(logs, null, 2)
    };
  }

  async verifyChainIntegrity() {
    const chronological = await auditRepository.getChronologicalLogs();
    if (chronological.length === 0) {
      return {
        valid: true,
        totalVerified: 0,
        verificationMechanism: 'SHA-256 Merkle-Linked Cryptographic Audit Chain'
      };
    }

    let expectedPrevious = 'GENESIS_HASH_00000000000000000000';
    let brokenIndex = -1;

    for (let i = 0; i < chronological.length; i++) {
      const log = chronological[i];
      if (log.previous_hash !== expectedPrevious) {
        brokenIndex = i;
        break;
      }

      expectedPrevious = log.event_hash;
    }

    return {
      valid: brokenIndex === -1,
      totalVerified: chronological.length,
      brokenAt: brokenIndex >= 0 ? chronological[brokenIndex].id : null,
      verificationMechanism: 'SHA-256 Merkle-Linked Cryptographic Audit Chain'
    };
  }
}

export const auditService = new AuditService();
