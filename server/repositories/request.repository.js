import { query } from '../config/database.js';

export class RequestRepository {
  async findAllByUserId(userId) {
    const reqRes = await query(
      `SELECT pr.*, m.name as mandate_name
       FROM purchase_requests pr
       LEFT JOIN mandates m ON pr.mandate_id = m.id
       WHERE pr.user_id = $1
       ORDER BY pr.created_at DESC`,
      [userId]
    );

    const requests = reqRes.rows;
    if (requests.length === 0) return [];

    const requestIds = requests.map(r => r.id);

    // Fetch payments
    const payRes = await query(
      `SELECT * FROM payments WHERE purchase_request_id = ANY($1)`,
      [requestIds]
    );
    const paymentsByReq = {};
    for (const p of payRes.rows) {
      paymentsByReq[p.purchase_request_id] = p;
    }

    // Fetch evidence
    const eviRes = await query(
      `SELECT * FROM purchase_evidence WHERE purchase_request_id = ANY($1)`,
      [requestIds]
    );
    const evidenceByReq = {};
    for (const pe of eviRes.rows) {
      if (!evidenceByReq[pe.purchase_request_id]) {
        evidenceByReq[pe.purchase_request_id] = [];
      }
      evidenceByReq[pe.purchase_request_id].push({
        field: pe.field_name,
        value: pe.observed_value,
        exactQuote: pe.exact_quote,
        match: pe.verified,
        reason: pe.expected_value
      });
    }

    return requests.map(r => {
      const p = paymentsByReq[r.id];
      return {
        ...r,
        provider_order_id: p?.provider_order_id || null,
        provider_capture_id: p?.provider_capture_id || null,
        payment_status: p?.status || null,
        quote_evidence: evidenceByReq[r.id] || []
      };
    });
  }

  async findById(id, userId = null) {
    let sql = `
      SELECT pr.*, m.name as mandate_name
      FROM purchase_requests pr
      LEFT JOIN mandates m ON pr.mandate_id = m.id
      WHERE pr.id = $1
    `;
    const params = [id];
    if (userId) {
      sql += ' AND pr.user_id = $2';
      params.push(userId);
    }

    const res = await query(sql, params);
    const r = res.rows[0];
    if (!r) return null;

    const payRes = await query(
      `SELECT * FROM payments WHERE purchase_request_id = $1`,
      [id]
    );
    const p = payRes.rows[0];

    const eviRes = await query(
      `SELECT * FROM purchase_evidence WHERE purchase_request_id = $1`,
      [id]
    );
    const quote_evidence = eviRes.rows.map(pe => ({
      field: pe.field_name,
      value: pe.observed_value,
      exactQuote: pe.exact_quote,
      match: pe.verified,
      reason: pe.expected_value
    }));

    return {
      ...r,
      payment_id: p?.id || null,
      provider_order_id: p?.provider_order_id || null,
      provider_capture_id: p?.provider_capture_id || null,
      payment_status: p?.status || null,
      single_use_token_hash: p?.single_use_token_hash || null,
      quote_evidence
    };
  }

  async create(data, client = null) {
    const runner = client || { query };
    const {
      id,
      userId,
      mandateId,
      agentPassportId = null,
      agentName,
      productTitle,
      merchantId = null,
      merchantName,
      productUrl = '',
      amountMinor,
      currency = 'INR',
      category = 'General',
      policyVerdict,
      status,
      decisionType = '',
      decisionReason = '',
      idempotencyKey = null
    } = data;

    const res = await runner.query(
      `INSERT INTO purchase_requests (
         id, user_id, mandate_id, agent_passport_id, agent_name, product_title,
         merchant_id, merchant_name, product_url, amount_minor, currency, category,
         policy_verdict, status, decision_type, decision_reason, idempotency_key,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
       RETURNING *`,
      [
        id,
        userId,
        mandateId,
        agentPassportId,
        agentName,
        productTitle,
        merchantId,
        merchantName,
        productUrl,
        amountMinor,
        currency,
        category,
        policyVerdict,
        status,
        decisionType,
        decisionReason,
        idempotencyKey
      ]
    );

    return res.rows[0];
  }

  async updateStatus(id, status, updates = {}, client = null) {
    const runner = client || { query };
    const fields = ['status = $1', 'updated_at = NOW()'];
    const params = [status, id];
    let idx = 3;

    if (updates.decisionReason !== undefined) {
      fields.push(`decision_reason = $${idx++}`);
      params.push(updates.decisionReason);
    }
    if (updates.settledAt !== undefined) {
      fields.push(`settled_at = $${idx++}`);
      params.push(updates.settledAt);
    }

    const sql = `UPDATE purchase_requests SET ${fields.join(', ')} WHERE id = $2 RETURNING *`;
    const res = await runner.query(sql, params);
    return res.rows[0] || null;
  }

  async addEvidence(requestId, evidenceItems, client = null) {
    if (!evidenceItems || evidenceItems.length === 0) return;
    const runner = client || { query };

    for (const item of evidenceItems) {
      const id = `evi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await runner.query(
        `INSERT INTO purchase_evidence (
           id, purchase_request_id, field_name, expected_value, observed_value, exact_quote, verified, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          id,
          requestId,
          item.field || item.fieldName || 'Specification',
          item.reason || item.expectedValue || '',
          item.value || item.observedValue || '',
          item.exactQuote || item.quote || '',
          item.match !== undefined ? Boolean(item.match) : true
        ]
      );
    }
  }
}

export const requestRepository = new RequestRepository();
