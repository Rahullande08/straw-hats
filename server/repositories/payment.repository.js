import { query } from '../config/database.js';

export class PaymentRepository {
  async getPaymentMethods(userId) {
    const res = await query(
      `SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );
    return res.rows;
  }

  async getPaymentMethodById(id, userId = null) {
    let sql = `SELECT * FROM payment_methods WHERE id = $1`;
    const params = [id];
    if (userId) {
      sql += ' AND user_id = $2';
      params.push(userId);
    }
    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  async createPaymentMethod(data) {
    const {
      id,
      userId,
      type = 'PAYPAL_SANDBOX',
      name,
      identifier,
      provider = 'paypal',
      providerReference = null,
      autoApproveCapMinor = 300000,
      spendingLimitMinor = 2500000,
      balance = '$5,000.00 USD (Sandbox)',
      status = 'CONNECTED',
      frozen = false,
      sandboxMode = true
    } = data;

    const res = await query(
      `INSERT INTO payment_methods (
         id, user_id, type, name, identifier, provider, provider_reference,
         auto_approve_cap_minor, spending_limit_minor, balance, status, frozen, sandbox_mode,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING *`,
      [
        id,
        userId,
        type,
        name,
        identifier,
        provider,
        providerReference,
        autoApproveCapMinor,
        spendingLimitMinor,
        balance,
        status,
        frozen,
        sandboxMode
      ]
    );
    return res.rows[0];
  }

  async toggleFreezePaymentMethod(id, userId) {
    const res = await query(
      `UPDATE payment_methods
       SET frozen = NOT frozen,
           status = CASE WHEN frozen = true THEN 'ACTIVE' ELSE 'FROZEN' END,
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    return res.rows[0] || null;
  }

  async updatePaymentLimits(id, userId, autoApproveCapMinor = null, spendingLimitMinor = null) {
    const fields = ['updated_at = NOW()'];
    const params = [id, userId];
    let idx = 3;

    if (autoApproveCapMinor !== null) {
      fields.push(`auto_approve_cap_minor = $${idx++}`);
      params.push(autoApproveCapMinor);
    }
    if (spendingLimitMinor !== null) {
      fields.push(`spending_limit_minor = $${idx++}`);
      params.push(spendingLimitMinor);
    }

    const sql = `UPDATE payment_methods SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  async createPayment(data, client = null) {
    const runner = client || { query };
    const {
      id,
      purchaseRequestId,
      paymentMethodId = null,
      provider = 'paypal',
      providerOrderId = null,
      providerCaptureId = null,
      amountMinor,
      currency = 'INR',
      status = 'AWAITING_APPROVAL',
      singleUseTokenHash = null,
      idempotencyKey = null,
      metadataJson = {}
    } = data;

    const res = await runner.query(
      `INSERT INTO payments (
         id, purchase_request_id, payment_method_id, provider, provider_order_id,
         provider_capture_id, amount_minor, currency, status, single_use_token_hash,
         idempotency_key, metadata_json, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [
        id,
        purchaseRequestId,
        paymentMethodId,
        provider,
        providerOrderId,
        providerCaptureId,
        amountMinor,
        currency,
        status,
        singleUseTokenHash,
        idempotencyKey,
        JSON.stringify(metadataJson)
      ]
    );
    return res.rows[0];
  }

  async getPaymentByRequestId(purchaseRequestId) {
    const res = await query(
      `SELECT * FROM payments WHERE purchase_request_id = $1`,
      [purchaseRequestId]
    );
    return res.rows[0] || null;
  }

  async updatePaymentStatus(id, status, captureId = null, client = null) {
    const runner = client || { query };
    const fields = ['status = $1', 'updated_at = NOW()'];
    const params = [status, id];
    let idx = 3;

    if (captureId) {
      fields.push(`provider_capture_id = $${idx++}`);
      params.push(captureId);
    }

    const sql = `UPDATE payments SET ${fields.join(', ')} WHERE id = $2 RETURNING *`;
    const res = await runner.query(sql, params);
    return res.rows[0] || null;
  }
}

export const paymentRepository = new PaymentRepository();
