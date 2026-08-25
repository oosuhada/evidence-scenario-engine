import type {
  Alternative,
  Assumption,
  DecisionTemplateId,
  EvidenceItem,
  MetricDefinition,
  ScenarioVersion,
  StrategyDecision,
} from './types';
import { MODEL_VERSION } from '../scenario-engine/engine';

const now = () => new Date().toISOString();

const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const baseMetrics: MetricDefinition[] = [
  {
    id: 'strategic-value',
    name: 'Strategic value',
    unit: 'index',
    direction: 'maximize',
    weight: 0.35,
  },
  {
    id: 'operating-impact',
    name: 'Operating impact',
    unit: 'index',
    direction: 'maximize',
    weight: 0.3,
  },
  {
    id: 'cost-risk',
    name: 'Cost / risk load',
    unit: 'index',
    direction: 'minimize',
    weight: 0.2,
    guardrail: {
      operator: 'lte',
      threshold: 82,
      label: 'P90 cost / risk load must remain ≤ 82',
    },
  },
  {
    id: 'adoption',
    name: 'Adoption readiness',
    unit: '%',
    direction: 'maximize',
    weight: 0.15,
  },
];

const baseAssumptions: Assumption[] = [
  {
    id: 'data-readiness',
    name: 'Data readiness',
    description: 'Share of required operational data that is clean, accessible, and representative.',
    value: 72,
    min: 30,
    max: 100,
    unit: '%',
    confidence: 0.72,
    unresolved: false,
    impacts: [
      { metricId: 'strategic-value', effectAtMin: -0.18, effectAtMax: 0.08 },
      { metricId: 'operating-impact', effectAtMin: -0.28, effectAtMax: 0.12 },
      { metricId: 'cost-risk', effectAtMin: 0.22, effectAtMax: -0.08 },
    ],
  },
  {
    id: 'operator-adoption',
    name: 'Operator adoption',
    description: 'Expected share of target users who will incorporate the change into routine work.',
    value: 64,
    min: 20,
    max: 100,
    unit: '%',
    confidence: 0.61,
    unresolved: true,
    impacts: [
      { metricId: 'operating-impact', effectAtMin: -0.24, effectAtMax: 0.14 },
      { metricId: 'adoption', effectAtMin: -0.34, effectAtMax: 0.18 },
    ],
  },
  {
    id: 'integration-complexity',
    name: 'Integration complexity',
    description: 'Relative integration burden across systems, process changes, and governance.',
    value: 56,
    min: 10,
    max: 100,
    unit: 'index',
    confidence: 0.68,
    unresolved: true,
    impacts: [
      { metricId: 'cost-risk', effectAtMin: -0.18, effectAtMax: 0.3 },
      { metricId: 'operating-impact', effectAtMin: 0.04, effectAtMax: -0.14 },
    ],
  },
  {
    id: 'time-to-value',
    name: 'Time to value',
    description: 'Expected months until measurable business value appears.',
    value: 9,
    min: 3,
    max: 24,
    unit: 'months',
    confidence: 0.58,
    unresolved: true,
    impacts: [
      { metricId: 'strategic-value', effectAtMin: 0.12, effectAtMax: -0.16 },
      { metricId: 'cost-risk', effectAtMin: -0.05, effectAtMax: 0.14 },
    ],
  },
  {
    id: 'execution-capacity',
    name: 'Execution capacity',
    description: 'Available leadership, engineering, operations, and change-management capacity.',
    value: 70,
    min: 20,
    max: 100,
    unit: '%',
    confidence: 0.75,
    unresolved: false,
    impacts: [
      { metricId: 'strategic-value', effectAtMin: -0.12, effectAtMax: 0.08 },
      { metricId: 'cost-risk', effectAtMin: 0.17, effectAtMax: -0.09 },
      { metricId: 'adoption', effectAtMin: -0.18, effectAtMax: 0.1 },
    ],
  },
];

function createVersion(assumptions: Assumption[], label = 'Baseline', number = 1): ScenarioVersion {
  return {
    id: makeId('version'),
    number,
    label,
    createdAt: now(),
    horizonMonths: 12,
    seed: 190731 + number * 137,
    iterations: 600,
    modelVersion: MODEL_VERSION,
    assumptionValues: Object.fromEntries(assumptions.map((assumption) => [assumption.id, assumption.value])),
    notes: '',
  };
}

function buildDecision(input: {
  templateId: DecisionTemplateId;
  title: string;
  question: string;
  description: string;
  alternatives: Alternative[];
  assumptions?: Assumption[];
  evidence?: EvidenceItem[];
  metrics?: MetricDefinition[];
}): StrategyDecision {
  const assumptions = structuredClone(input.assumptions ?? baseAssumptions);
  const version = createVersion(assumptions);
  const timestamp = now();
  return {
    id: makeId('decision'),
    title: input.title,
    question: input.question,
    description: input.description,
    templateId: input.templateId,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: 'draft',
    alternatives: structuredClone(input.alternatives),
    assumptions,
    metrics: structuredClone(input.metrics ?? baseMetrics),
    evidence: structuredClone(input.evidence ?? []),
    versions: [version],
    activeVersionId: version.id,
    decisionRecords: [],
    shareLinks: [],
    notes: '',
  };
}

export function createBlankDecision(): StrategyDecision {
  return buildDecision({
    templateId: 'blank',
    title: 'Untitled strategic decision',
    question: 'What decision are we trying to make?',
    description: 'Define alternatives, assumptions, evidence, and metrics before running the model.',
    alternatives: [
      { id: makeId('alt'), name: 'Alternative A', description: 'First viable option', baseMetrics: { 'strategic-value': 55, 'operating-impact': 50, 'cost-risk': 45, adoption: 55 } },
      { id: makeId('alt'), name: 'Alternative B', description: 'Second viable option', baseMetrics: { 'strategic-value': 60, 'operating-impact': 58, 'cost-risk': 55, adoption: 58 } },
      { id: makeId('alt'), name: 'Alternative C', description: 'Third viable option', baseMetrics: { 'strategic-value': 65, 'operating-impact': 64, 'cost-risk': 68, adoption: 52 } },
    ],
  });
}

export function createSampleDecision(): StrategyDecision {
  const alternatives: Alternative[] = [
    {
      id: 'stage-pilot',
      name: 'Staged pilot',
      description: 'Two production lines, human-in-the-loop inspection, explicit success gate after 12 weeks.',
      baseMetrics: { 'strategic-value': 68, 'operating-impact': 61, 'cost-risk': 38, adoption: 72 },
    },
    {
      id: 'plant-rollout',
      name: 'Plant-wide rollout',
      description: 'Deploy to all target lines within two quarters with centralized model operations.',
      baseMetrics: { 'strategic-value': 88, 'operating-impact': 86, 'cost-risk': 76, adoption: 63 },
    },
    {
      id: 'defer-build',
      name: 'Defer and build',
      description: 'Delay deployment while strengthening data, training, and integration foundations.',
      baseMetrics: { 'strategic-value': 48, 'operating-impact': 38, 'cost-risk': 24, adoption: 78 },
    },
  ];
  const evidence: EvidenceItem[] = [
    {
      id: 'ev-pilot-yield',
      title: 'Vision pilot defect-detection study',
      source: 'Internal pilot / Line 3 / 8 weeks',
      note: 'Observed a 14% reduction in manual re-checks; sample does not cover night shift.',
      strength: 0.82,
      relevance: 0.92,
      stance: 'supports',
      assumptionIds: ['data-readiness', 'time-to-value'],
      addedAt: now(),
    },
    {
      id: 'ev-training',
      title: 'Operator training interviews',
      source: '18 operator interviews',
      note: 'Adoption was positive when overrides were visible; union consultation is not complete.',
      strength: 0.64,
      relevance: 0.8,
      stance: 'supports',
      assumptionIds: ['operator-adoption', 'execution-capacity'],
      addedAt: now(),
    },
    {
      id: 'ev-mes-gap',
      title: 'MES integration gap assessment',
      source: 'Architecture review / Rev 2',
      note: 'Legacy line controllers require an adapter layer not included in the original estimate.',
      strength: 0.88,
      relevance: 0.95,
      stance: 'contradicts',
      assumptionIds: ['integration-complexity', 'time-to-value'],
      addedAt: now(),
    },
  ];
  return buildDecision({
    templateId: 'ai-adoption',
    title: 'Manufacturing AI deployment',
    question: 'How should we deploy generative AI-assisted inspection on the manufacturing floor?',
    description: 'Balance measurable productivity gains against integration risk, operator adoption, and evidence quality.',
    alternatives,
    evidence,
  });
}

export function createTemplateDecision(templateId: Exclude<DecisionTemplateId, 'blank'>): StrategyDecision {
  if (templateId === 'ai-adoption') return createSampleDecision();
  if (templateId === 'vendor-selection') {
    return buildDecision({
      templateId,
      title: 'Strategic vendor selection',
      question: 'Which vendor gives us the best risk-adjusted strategic fit?',
      description: 'Compare incumbent, specialist, and platform alternatives using the same evidence-backed scenario model.',
      alternatives: [
        { id: makeId('alt'), name: 'Incumbent suite', description: 'Lower integration burden, moderate upside.', baseMetrics: { 'strategic-value': 66, 'operating-impact': 62, 'cost-risk': 44, adoption: 74 } },
        { id: makeId('alt'), name: 'Specialist vendor', description: 'Higher functional fit with vendor concentration risk.', baseMetrics: { 'strategic-value': 79, 'operating-impact': 78, 'cost-risk': 61, adoption: 68 } },
        { id: makeId('alt'), name: 'Composable platform', description: 'Maximum flexibility with greater execution burden.', baseMetrics: { 'strategic-value': 87, 'operating-impact': 82, 'cost-risk': 73, adoption: 57 } },
      ],
    });
  }
  if (templateId === 'factory-automation') {
    return buildDecision({
      templateId,
      title: 'Factory automation expansion',
      question: 'Which automation scope should we fund for the next operating cycle?',
      description: 'Model staged, cell-level, and full-line automation with adoption and integration constraints.',
      alternatives: [
        { id: makeId('alt'), name: 'Cell automation', description: 'Target two bottleneck cells.', baseMetrics: { 'strategic-value': 62, 'operating-impact': 65, 'cost-risk': 38, adoption: 76 } },
        { id: makeId('alt'), name: 'Line automation', description: 'Automate one complete line.', baseMetrics: { 'strategic-value': 76, 'operating-impact': 80, 'cost-risk': 58, adoption: 63 } },
        { id: makeId('alt'), name: 'Plant program', description: 'Multi-line automation with shared controls.', baseMetrics: { 'strategic-value': 91, 'operating-impact': 92, 'cost-risk': 84, adoption: 51 } },
      ],
    });
  }
  return buildDecision({
    templateId,
    title: 'Product launch strategy',
    question: 'What launch strategy best balances learning speed, reach, and downside exposure?',
    description: 'Compare controlled, phased, and broad launch alternatives under explicit market assumptions.',
    alternatives: [
      { id: makeId('alt'), name: 'Controlled beta', description: 'Narrow launch with explicit learning gates.', baseMetrics: { 'strategic-value': 58, 'operating-impact': 52, 'cost-risk': 31, adoption: 70 } },
      { id: makeId('alt'), name: 'Phased launch', description: 'Segment-by-segment release.', baseMetrics: { 'strategic-value': 76, 'operating-impact': 73, 'cost-risk': 49, adoption: 67 } },
      { id: makeId('alt'), name: 'Broad launch', description: 'Fastest market coverage with maximum exposure.', baseMetrics: { 'strategic-value': 92, 'operating-impact': 88, 'cost-risk': 79, adoption: 61 } },
    ],
  });
}

export function cloneAsNewVersion(decision: StrategyDecision, label?: string): StrategyDecision {
  const current = decision.versions.find((entry) => entry.id === decision.activeVersionId) ?? decision.versions[decision.versions.length - 1];
  const number = Math.max(...decision.versions.map((entry) => entry.number), 0) + 1;
  const version: ScenarioVersion = {
    ...(current ?? createVersion(decision.assumptions)),
    id: makeId('version'),
    number,
    label: label ?? `Version ${number}`,
    createdAt: now(),
    seed: 190731 + number * 137,
    assumptionValues: Object.fromEntries(decision.assumptions.map((assumption) => [assumption.id, assumption.value])),
    notes: '',
  };
  return {
    ...decision,
    updatedAt: now(),
    versions: [...decision.versions, version],
    activeVersionId: version.id,
  };
}

export function createEntityId(prefix: string) {
  return makeId(prefix);
}
