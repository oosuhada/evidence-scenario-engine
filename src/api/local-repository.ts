import type { StrategyDecision } from '../decision-model/types';
import { strategyDecisionSchema } from '../schemas/decision';
import type { DecisionRepository } from './repository';

const DECISIONS_KEY = 'scenario-prism:decisions:v2';
const SHARES_KEY = 'scenario-prism:shares:v2';

type ShareSnapshot = {
  token: string;
  revoked: boolean;
  decision: StrategyDecision;
};

function readArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T[] : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export class LocalDecisionRepository implements DecisionRepository {
  async list() {
    return readArray<unknown>(DECISIONS_KEY)
      .map((entry) => strategyDecisionSchema.safeParse(entry))
      .filter((result) => result.success)
      .map((result) => result.data)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    const decisions = await this.list();
    return decisions.find((decision) => decision.id === id) ?? null;
  }

  async save(decision: StrategyDecision) {
    const parsed = strategyDecisionSchema.parse(decision);
    const decisions = await this.list();
    const next = [parsed, ...decisions.filter((entry) => entry.id !== parsed.id)];
    writeArray(DECISIONS_KEY, next);
    return parsed;
  }

  async remove(id: string) {
    const decisions = await this.list();
    writeArray(DECISIONS_KEY, decisions.filter((entry) => entry.id !== id));
  }

  async createShare(decision: StrategyDecision, token: string) {
    const shares = readArray<ShareSnapshot>(SHARES_KEY);
    const snapshot: ShareSnapshot = {
      token,
      revoked: false,
      decision: structuredClone(decision),
    };
    writeArray(SHARES_KEY, [snapshot, ...shares.filter((entry) => entry.token !== token)]);
  }

  async getShared(token: string) {
    const shares = readArray<ShareSnapshot>(SHARES_KEY);
    const match = shares.find((entry) => entry.token === token && !entry.revoked);
    if (!match) return null;
    const parsed = strategyDecisionSchema.safeParse(match.decision);
    return parsed.success ? parsed.data : null;
  }

  async revokeShare(token: string) {
    const shares = readArray<ShareSnapshot>(SHARES_KEY);
    writeArray(SHARES_KEY, shares.map((entry) => entry.token === token ? { ...entry, revoked: true } : entry));
  }
}
