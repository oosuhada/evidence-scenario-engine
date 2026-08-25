import type { StrategyDecision } from '../decision-model/types';
import { strategyDecisionSchema } from '../schemas/decision';
import type { DecisionRepository } from './repository';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export class HttpDecisionRepository implements DecisionRepository {
  async list() {
    const payload = await request<unknown[]>('/api/decisions');
    return payload.map((item) => strategyDecisionSchema.parse(item));
  }

  async get(id: string) {
    const response = await fetch(`/api/decisions/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return strategyDecisionSchema.parse(await response.json());
  }

  async save(decision: StrategyDecision) {
    const payload = await request<unknown>(`/api/decisions/${encodeURIComponent(decision.id)}`, {
      method: 'PUT',
      body: JSON.stringify(decision),
    });
    return strategyDecisionSchema.parse(payload);
  }

  async remove(id: string) {
    const response = await fetch(`/api/decisions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw new Error(`API request failed: ${response.status}`);
  }

  async createShare(decision: StrategyDecision, token: string) {
    await request(`/api/share-links`, { method: 'POST', body: JSON.stringify({ token, decision }) });
  }

  async getShared(token: string) {
    const response = await fetch(`/api/share-links/${encodeURIComponent(token)}`);
    if (response.status === 404 || response.status === 410) return null;
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return strategyDecisionSchema.parse(await response.json());
  }

  async revokeShare(token: string) {
    const response = await fetch(`/api/share-links/${encodeURIComponent(token)}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw new Error(`API request failed: ${response.status}`);
  }
}
