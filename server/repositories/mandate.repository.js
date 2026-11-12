import { query } from '../config/database.js';

export class MandateRepository {
  async findAllByUserId(userId) {
    const mandatesRes = await query(
      `SELECT * FROM mandates WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const mandates = mandatesRes.rows;
    if (mandates.length === 0) return [];

    const mandateIds = mandates.map(m => m.id);
    const mmRes = await query(
      `SELECT * FROM mandate_merchants WHERE mandate_id = ANY($1)`,
      [mandateIds]
    );

    const merchantsByMandate = {};
    for (const mm of mmRes.rows) {
      if (!merchantsByMandate[mm.mandate_id]) {
        merchantsByMandate[mm.mandate_id] = [];
      }
      merchantsByMandate[mm.mandate_id].push({
        merchantName: mm.merchant_name,
        merchantDomain: mm.merchant_domain,
        ruleType: mm.rule_type
      });
    }

    return mandates.map(m => ({
      ...m,
      merchants: merchantsByMandate[m.id] || []
    }));
  }

  async findById(id, userId = null) {
    let sql = `SELECT * FROM mandates WHERE id = $1`;
    const params = [id];
    if (userId) {
      sql += ' AND user_id = $2';
      params.push(userId);
    }

    const res = await query(sql, params);
    const mandate = res.rows[0];
    if (!mandate) return null;

    const mmRes = await query(
      `SELECT * FROM mandate_merchants WHERE mandate_id = $1`,
      [id]
    );

    const merchants = mmRes.rows.map(mm => ({
      merchantName: mm.merchant_name,
      merchantDomain: mm.merchant_domain,
      ruleType: mm.rule_type
    }));

    return {
      ...mandate,
      merchants
    };
  }

  async findByIdForUpdate(id, client) {
    const runner = client || { query };
    const res = await runner.query(
      `SELECT * FROM mandates WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return res.rows[0] || null;
  }

  async create(data, client = null) {
    const runner = client || { query };
    const {
      id,
      userId,
      name,
      description = '',
      category,
      currency = 'INR',
      budgetCeiling,
      utilizedAmount = 0,
      reservedAmount = 0,
      singlePurchaseLimit,
      humanApprovalThreshold,
      cosignerThreshold,
      plainTextRule = '',
      status = 'ACTIVE',
      agents = ['Claude Shopping'],
      expiresAt = null
    } = data;

    const res = await runner.query(
      `INSERT INTO mandates (
         id, user_id, name, description, category, currency,
         budget_ceiling, utilized_amount, reserved_amount, single_purchase_limit,
         human_approval_threshold, cosigner_threshold, plain_text_rule, status,
         agents, expires_at, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
       RETURNING *`,
      [
        id,
        userId,
        name,
        description,
        category,
        currency,
        budgetCeiling,
        utilizedAmount,
        reservedAmount,
        singlePurchaseLimit,
        humanApprovalThreshold,
        cosignerThreshold,
        plainTextRule,
        status,
        JSON.stringify(agents),
        expiresAt
      ]
    );

    return res.rows[0];
  }

  async update(id, userId, updates) {
    const fields = [];
    const params = [id, userId];
    let idx = 3;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(updates.name);
    }
    if (updates.budgetCeiling !== undefined) {
      fields.push(`budget_ceiling = $${idx++}`);
      params.push(updates.budgetCeiling);
    }
    if (updates.singlePurchaseLimit !== undefined) {
      fields.push(`single_purchase_limit = $${idx++}`);
      params.push(updates.singlePurchaseLimit);
    }
    if (updates.humanApprovalThreshold !== undefined) {
      fields.push(`human_approval_threshold = $${idx++}`);
      params.push(updates.humanApprovalThreshold);
    }
    if (updates.cosignerThreshold !== undefined) {
      fields.push(`cosigner_threshold = $${idx++}`);
      params.push(updates.cosignerThreshold);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(updates.status);
    }
    if (updates.plainTextRule !== undefined) {
      fields.push(`plain_text_rule = $${idx++}`);
      params.push(updates.plainTextRule);
    }

    fields.push(`updated_at = NOW()`);

    const sql = `UPDATE mandates SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`;
    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  async setStatus(id, userId, status) {
    const res = await query(
      `UPDATE mandates SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *`,
      [status, id, userId]
    );
    return res.rows[0] || null;
  }

  async reserveBudget(id, amountMinor, client = null) {
    const runner = client || { query };
    const res = await runner.query(
      `UPDATE mandates
       SET reserved_amount = reserved_amount + $1, updated_at = NOW()
       WHERE id = $2
         AND status = 'ACTIVE'
         AND (utilized_amount + reserved_amount + $1) <= budget_ceiling
       RETURNING *`,
      [amountMinor, id]
    );
    return res.rows[0] || null;
  }

  async releaseReservedBudget(id, amountMinor, client = null) {
    const runner = client || { query };
    const res = await runner.query(
      `UPDATE mandates
       SET reserved_amount = GREATEST(0, reserved_amount - $1), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amountMinor, id]
    );
    return res.rows[0] || null;
  }

  async convertReservedToUtilized(id, amountMinor, client = null) {
    const runner = client || { query };
    const res = await runner.query(
      `UPDATE mandates
       SET reserved_amount = GREATEST(0, reserved_amount - $1),
           utilized_amount = utilized_amount + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amountMinor, id]
    );
    return res.rows[0] || null;
  }

  async directAddUtilized(id, amountMinor, client = null) {
    const runner = client || { query };
    const res = await runner.query(
      `UPDATE mandates
       SET utilized_amount = utilized_amount + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amountMinor, id]
    );
    return res.rows[0] || null;
  }

  async addMerchantRule(mandateId, merchantName, merchantDomain = null, ruleType = 'ALLOWED', client = null) {
    const runner = client || { query };
    const id = `mm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await runner.query(
      `INSERT INTO mandate_merchants (id, mandate_id, merchant_name, merchant_domain, rule_type, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, mandateId, merchantName, merchantDomain, ruleType]
    );
  }

  async clearMerchantRules(mandateId, client = null) {
    const runner = client || { query };
    await runner.query('DELETE FROM mandate_merchants WHERE mandate_id = $1', [mandateId]);
  }
}

export const mandateRepository = new MandateRepository();
