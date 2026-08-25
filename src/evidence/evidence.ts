import type { Assumption, EvidenceItem, StrategyDecision } from '../decision-model/types';
import { calculateEvidenceStrength } from '../scenario-engine/engine';

export interface EvidenceLedgerRow {
  evidence: EvidenceItem;
  assumptions: Assumption[];
  weightedStrength: number;
}

export function buildEvidenceLedger(decision: StrategyDecision): EvidenceLedgerRow[] {
  return decision.evidence.map((evidence) => ({
    evidence,
    assumptions: decision.assumptions.filter((assumption) => evidence.assumptionIds.includes(assumption.id)),
    weightedStrength: Math.round(evidence.strength * evidence.relevance * 100),
  }));
}

export function evidenceCoverage(decision: StrategyDecision) {
  const covered = decision.assumptions.filter((assumption) => decision.evidence.some((item) => item.assumptionIds.includes(assumption.id))).length;
  return {
    covered,
    total: decision.assumptions.length,
    percentage: decision.assumptions.length === 0 ? 0 : Math.round((covered / decision.assumptions.length) * 100),
    strength: Math.round(calculateEvidenceStrength(decision) * 100),
  };
}
