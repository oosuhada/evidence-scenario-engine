export type DecisionStatus = 'draft' | 'recorded';

export type MetricDirection = 'maximize' | 'minimize';

export type EvidenceStance = 'supports' | 'contradicts' | 'neutral';

export type DecisionTemplateId = 'blank' | 'ai-adoption' | 'vendor-selection' | 'factory-automation' | 'product-launch';

export interface MetricDefinition {
  id: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  weight: number;
  guardrail?: {
    operator: 'lte' | 'gte';
    threshold: number;
    label: string;
  };
}

export interface Alternative {
  id: string;
  name: string;
  description: string;
  baseMetrics: Record<string, number>;
}

export interface AssumptionImpact {
  metricId: string;
  effectAtMin: number;
  effectAtMax: number;
}

export interface Assumption {
  id: string;
  name: string;
  description: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  confidence: number;
  unresolved: boolean;
  impacts: AssumptionImpact[];
}

export interface EvidenceItem {
  id: string;
  title: string;
  source: string;
  note: string;
  strength: number;
  relevance: number;
  stance: EvidenceStance;
  assumptionIds: string[];
  addedAt: string;
}

export interface ScenarioVersion {
  id: string;
  number: number;
  label: string;
  createdAt: string;
  horizonMonths: number;
  seed: number;
  iterations: number;
  modelVersion: string;
  assumptionValues: Record<string, number>;
  notes: string;
}

export type ScenarioSetKind = 'base' | 'upside' | 'downside' | 'stress' | 'custom';

export interface ScenarioSet {
  id: string;
  name: string;
  kind: ScenarioSetKind;
  assumptionValues: Record<string, number>;
  rationale: string;
  revisitConditions: string;
  createdAt: string;
}

export interface InvestigationItem {
  id: string;
  assumptionId: string;
  title: string;
  evidenceRequest: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface DecisionRecord {
  id: string;
  recordedAt: string;
  selectedAlternativeId: string;
  rationale: string;
  conditions: string;
  versionId: string;
}

export interface ShareLink {
  token: string;
  createdAt: string;
  revokedAt?: string;
  versionId: string;
}

export interface StrategyDecision {
  id: string;
  title: string;
  question: string;
  description: string;
  templateId: DecisionTemplateId;
  createdAt: string;
  updatedAt: string;
  status: DecisionStatus;
  alternatives: Alternative[];
  assumptions: Assumption[];
  metrics: MetricDefinition[];
  evidence: EvidenceItem[];
  versions: ScenarioVersion[];
  scenarioSets: ScenarioSet[];
  investigationItems: InvestigationItem[];
  activeVersionId: string;
  decisionRecords: DecisionRecord[];
  shareLinks: ShareLink[];
  notes: string;
}

export interface MetricOutcome {
  metricId: string;
  expected: number;
  low: number;
  high: number;
  samples: number[];
  formula: string;
  inputTrace: Array<{
    label: string;
    value: number;
    contribution: number;
  }>;
}

export interface AlternativeOutcome {
  alternativeId: string;
  score: number;
  uncertainty: number;
  evidenceStrength: number;
  guardrailPass: boolean;
  metricOutcomes: MetricOutcome[];
}

export interface ScenarioRun {
  id: string;
  decisionId: string;
  versionId: string;
  generatedAt: string;
  seed: number;
  iterations: number;
  modelVersion: string;
  outcomes: AlternativeOutcome[];
  recommendedAlternativeId: string;
  decisionRule: string;
}

export interface SensitivityResult {
  assumptionId: string;
  assumptionName: string;
  lowScoreDelta: number;
  highScoreDelta: number;
  magnitude: number;
}

export interface VersionDifference {
  assumptionId: string;
  assumptionName: string;
  previousValue: number;
  currentValue: number;
  delta: number;
}

export interface SkepticResult {
  vulnerableAssumption: string;
  missingEvidence: string;
  counterScenario: string;
  falsificationTest: string;
  mitigation: string;
  source: 'provider' | 'deterministic-fallback';
}
