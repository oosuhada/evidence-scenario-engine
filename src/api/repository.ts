import type { StrategyDecision } from '../decision-model/types';

export interface DecisionRepository {
  list(): Promise<StrategyDecision[]>;
  get(id: string): Promise<StrategyDecision | null>;
  save(decision: StrategyDecision): Promise<StrategyDecision>;
  remove(id: string): Promise<void>;
  createShare(decision: StrategyDecision, token: string): Promise<void>;
  getShared(token: string): Promise<StrategyDecision | null>;
  revokeShare(token: string): Promise<void>;
}
