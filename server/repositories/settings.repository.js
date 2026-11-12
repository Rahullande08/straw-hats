import { query } from '../config/database.js';

export class SettingsRepository {
  async getAllForUser(userId) {
    const res = await query(
      `SELECT setting_key, setting_value FROM system_settings WHERE user_id = $1`,
      [userId]
    );
    const settings = {};
    for (const row of res.rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }

  async getSetting(userId, key, defaultValue = null) {
    const res = await query(
      `SELECT setting_value FROM system_settings WHERE user_id = $1 AND setting_key = $2`,
      [userId, key]
    );
    if (res.rows.length === 0) return defaultValue;
    return res.rows[0].setting_value;
  }

  async saveSetting(userId, key, value) {
    const id = `sett_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const res = await query(
      `INSERT INTO system_settings (id, user_id, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, setting_key) DO UPDATE
       SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
       RETURNING *`,
      [id, userId, key, JSON.stringify(value)]
    );
    return res.rows[0];
  }

  async saveMultiple(userId, settingsObject) {
    for (const [key, value] of Object.entries(settingsObject)) {
      await this.saveSetting(userId, key, value);
    }
  }
}

export const settingsRepository = new SettingsRepository();
