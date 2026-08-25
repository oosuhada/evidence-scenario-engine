import type { DecisionRepository } from './repository';
import { HttpDecisionRepository } from './http-repository';
import { LocalDecisionRepository } from './local-repository';

const local = new LocalDecisionRepository();
const http = new HttpDecisionRepository();

class FallbackRepository implements DecisionRepository {
  private apiAvailable: boolean | null = null;

  private async useApi() {
    if (this.apiAvailable !== null) return this.apiAvailable;
    try {
      const response = await fetch('/api/health', { signal: AbortSignal.timeout(900) });
      this.apiAvailable = response.ok;
    } catch {
      this.apiAvailable = false;
    }
    return this.apiAvailable;
  }

  async list() {
    return await this.useApi() ? http.list() : local.list();
  }

  async get(id: string) {
    return await this.useApi() ? http.get(id) : local.get(id);
  }

  async save(decision: Parameters<DecisionRepository['save']>[0]) {
    return await this.useApi() ? http.save(decision) : local.save(decision);
  }

  async remove(id: string) {
    return await this.useApi() ? http.remove(id) : local.remove(id);
  }

  async createShare(decision: Parameters<DecisionRepository['createShare']>[0], token: string) {
    return await this.useApi() ? http.createShare(decision, token) : local.createShare(decision, token);
  }

  async getShared(token: string) {
    return await this.useApi() ? http.getShared(token) : local.getShared(token);
  }

  async revokeShare(token: string) {
    return await this.useApi() ? http.revokeShare(token) : local.revokeShare(token);
  }
}

export const decisionRepository: DecisionRepository = new FallbackRepository();
