import { settingsRepository } from '../repositories/settings.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';

const GLOBAL_USER_ID = 'usr_elena_vance';
const KILL_SWITCH_KEY = 'emergencyKillSwitch';

export class KillSwitchService {
  async getStatus() {
    const raw = await settingsRepository.getSetting(GLOBAL_USER_ID, KILL_SWITCH_KEY, {
      active: false,
      activatedAt: null,
      activatedBy: null,
      reason: null
    });
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  async toggle({ reason, userId = GLOBAL_USER_ID, userName = 'Elena Vance' }) {
    const current = await this.getStatus();
    const nextActive = !current.active;

    const nextState = {
      active: nextActive,
      activatedAt: nextActive ? new Date().toISOString() : null,
      activatedBy: nextActive ? userName : null,
      reason: nextActive ? (reason || 'Manual Emergency Halt Triggered via Security Center') : null,
      deactivatedAt: nextActive ? null : new Date().toISOString()
    };

    await settingsRepository.saveSetting(GLOBAL_USER_ID, KILL_SWITCH_KEY, nextState);

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: nextActive ? 'KILL_SWITCH_ENGAGED' : 'KILL_SWITCH_DISENGAGED',
      entityType: 'GATEWAY_SECURITY',
      entityId: 'global_kill_switch',
      action: nextActive ? 'ENGAGE_KILL_SWITCH' : 'DISENGAGE_KILL_SWITCH',
      outcome: nextActive ? 'BLOCKED' : 'SUCCESS',
      summary: nextActive
        ? 'EMERGENCY PROTOCOL: Gateway Kill-Switch ENGAGED. All autonomous authorizations halted.'
        : 'Emergency Kill-Switch DISENGAGED. Standard autonomous clearance restored.',
      amount: nextActive ? 'ALL AGENTS HALTED' : 'RESTORED',
      meta: 'Hardware Level Override'
    });

    return nextState;
  }
}

export const killSwitchService = new KillSwitchService();
