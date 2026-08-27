import type {
  Alternative,
  AlternativeOutcome,
  Assumption,
  MetricDefinition,
  MetricOutcome,
  ScenarioRun,
  ScenarioSet,
  ScenarioVersion,
  SensitivityResult,
  StrategyDecision,
  VersionDifference,
} from '../decision-model/types';

export const MODEL_VERSION = 'sp-deterministic-2.0.0';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const round = (value: number, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random: () => number) {
  const u = Math.max(Number.EPSILON, random());
  const v = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function normalizedAssumptionValue(assumption: Assumption, version: ScenarioVersion) {
  const selected = version.assumptionValues[assumption.id] ?? assumption.value;
  if (assumption.max === assumption.min) return 0.5;
  return clamp((selected - assumption.min) / (assumption.max - assumption.min), 0, 1);
}

function assumptionEffect(assumption: Assumption, metricId: string, version: ScenarioVersion) {
  const impact = assumption.impacts.find((entry) => entry.metricId === metricId);
  if (!impact) return 0;
  const normalized = normalizedAssumptionValue(assumption, version);
  return impact.effectAtMin + (impact.effectAtMax - impact.effectAtMin) * normalized;
}

export function calculateEvidenceStrength(decision: StrategyDecision, assumptionId?: string) {
  const relevant = assumptionId
    ? decision.evidence.filter((item) => item.assumptionIds.includes(assumptionId))
    : decision.evidence;
  if (relevant.length === 0) return 0.35;
  const weighted = relevant.reduce((sum, item) => {
    const stanceFactor = item.stance === 'contradicts' ? 0.82 : item.stance === 'neutral' ? 0.9 : 1;
    return sum + item.strength * item.relevance * stanceFactor;
  }, 0);
  return clamp(weighted / relevant.length, 0.1, 1);
}

function horizonMultiplier(metric: MetricDefinition, horizonMonths: number) {
  const normalized = clamp(horizonMonths / 12, 0.25, 5);
  if (metric.direction === 'maximize') return 0.82 + Math.log1p(normalized) * 0.26;
  return 0.9 + Math.sqrt(normalized) * 0.12;
}

function metricOutcome(
  decision: StrategyDecision,
  alternative: Alternative,
  metric: MetricDefinition,
  version: ScenarioVersion,
  random: () => number,
): MetricOutcome {
  const base = alternative.baseMetrics[metric.id] ?? 0;
  const horizon = horizonMultiplier(metric, version.horizonMonths);
  const trace = decision.assumptions.map((assumption) => {
    const contribution = assumptionEffect(assumption, metric.id, version);
    return {
      label: assumption.name,
      value: version.assumptionValues[assumption.id] ?? assumption.value,
      contribution,
    };
  }).filter((entry) => Math.abs(entry.contribution) > Number.EPSILON);
  const additiveEffect = trace.reduce((sum, item) => sum + item.contribution, 0);
  const expected = Math.max(0, base * horizon * (1 + additiveEffect));

  const linkedAssumptions = decision.assumptions.filter((assumption) => assumption.impacts.some((impact) => impact.metricId === metric.id));
  const confidence = linkedAssumptions.length === 0
    ? 0.6
    : linkedAssumptions.reduce((sum, assumption) => sum + assumption.confidence, 0) / linkedAssumptions.length;
  const evidence = linkedAssumptions.length === 0
    ? calculateEvidenceStrength(decision)
    : linkedAssumptions.reduce((sum, assumption) => sum + calculateEvidenceStrength(decision, assumption.id), 0) / linkedAssumptions.length;
  const unresolvedPenalty = linkedAssumptions.filter((assumption) => assumption.unresolved).length * 0.035;
  const uncertaintyRatio = clamp(0.06 + (1 - confidence) * 0.2 + (1 - evidence) * 0.18 + unresolvedPenalty, 0.05, 0.42);
  const samples: number[] = [];

  for (let index = 0; index < version.iterations; index += 1) {
    const sample = Math.max(0, expected * (1 + gaussian(random) * uncertaintyRatio));
    samples.push(sample);
  }

  samples.sort((a, b) => a - b);
  const lowIndex = Math.max(0, Math.floor(samples.length * 0.1));
  const highIndex = Math.min(samples.length - 1, Math.ceil(samples.length * 0.9));
  return {
    metricId: metric.id,
    expected: round(expected),
    low: round(samples[lowIndex] ?? expected),
    high: round(samples[highIndex] ?? expected),
    samples: samples.map((value) => round(value)),
    formula: 'base × horizonMultiplier × (1 + Σ assumptionImpact)',
    inputTrace: trace.map((entry) => ({ ...entry, value: round(entry.value), contribution: round(entry.contribution, 4) })),
  };
}

function scoreOutcome(metrics: MetricDefinition[], outcomes: MetricOutcome[]) {
  const weighted = metrics.reduce((sum, metric) => {
    const outcome = outcomes.find((entry) => entry.metricId === metric.id);
    if (!outcome) return sum;
    const normalized = clamp(outcome.expected / 100, 0, 2);
    const utility = metric.direction === 'maximize' ? normalized : 1 - clamp(normalized, 0, 1);
    return sum + utility * metric.weight;
  }, 0);
  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0) || 1;
  return round((weighted / totalWeight) * 100, 1);
}

function passesGuardrails(metrics: MetricDefinition[], outcomes: MetricOutcome[]) {
  return metrics.every((metric) => {
    if (!metric.guardrail) return true;
    const outcome = outcomes.find((entry) => entry.metricId === metric.id);
    if (!outcome) return false;
    return metric.guardrail.operator === 'lte'
      ? outcome.high <= metric.guardrail.threshold
      : outcome.low >= metric.guardrail.threshold;
  });
}

function calculateUncertainty(outcomes: MetricOutcome[], evidenceStrength: number) {
  if (outcomes.length === 0) return 100;
  const relativeSpread = outcomes.reduce((sum, outcome) => {
    const denominator = Math.max(1, outcome.expected);
    return sum + (outcome.high - outcome.low) / denominator;
  }, 0) / outcomes.length;
  return round(clamp(relativeSpread * 55 + (1 - evidenceStrength) * 28, 4, 96), 1);
}

export function runScenario(decision: StrategyDecision, versionId = decision.activeVersionId): ScenarioRun {
  const version = decision.versions.find((entry) => entry.id === versionId) ?? decision.versions[decision.versions.length - 1];
  if (!version) throw new Error('A scenario version is required before running the model.');
  const random = mulberry32(version.seed);
  const evidenceStrength = calculateEvidenceStrength(decision);
  const outcomes: AlternativeOutcome[] = decision.alternatives.map((alternative) => {
    const metricOutcomes = decision.metrics.map((metric) => metricOutcome(decision, alternative, metric, version, random));
    const score = scoreOutcome(decision.metrics, metricOutcomes);
    return {
      alternativeId: alternative.id,
      score,
      uncertainty: calculateUncertainty(metricOutcomes, evidenceStrength),
      evidenceStrength: round(evidenceStrength * 100, 1),
      guardrailPass: passesGuardrails(decision.metrics, metricOutcomes),
      metricOutcomes,
    };
  });
  const ranked = [...outcomes].sort((a, b) => {
    if (a.guardrailPass !== b.guardrailPass) return a.guardrailPass ? -1 : 1;
    return b.score - a.score;
  });
  return {
    id: `run-${decision.id}-${version.id}-${version.seed}`,
    decisionId: decision.id,
    versionId: version.id,
    generatedAt: new Date().toISOString(),
    seed: version.seed,
    iterations: version.iterations,
    modelVersion: version.modelVersion,
    outcomes,
    recommendedAlternativeId: ranked[0]?.alternativeId ?? '',
    decisionRule: 'Prefer alternatives that pass every guardrail, then maximize weighted normalized utility. Ranges are model uncertainty, not probabilities of real-world success.',
  };
}

export function calculateSensitivity(decision: StrategyDecision, run: ScenarioRun): SensitivityResult[] {
  const selectedAlternativeId = run.recommendedAlternativeId;
  const version = decision.versions.find((entry) => entry.id === run.versionId);
  if (!version) return [];
  const baseline = run.outcomes.find((outcome) => outcome.alternativeId === selectedAlternativeId)?.score ?? 0;
  return decision.assumptions.map((assumption) => {
    const span = assumption.max - assumption.min;
    const delta = Math.max(span * 0.1, Number.EPSILON);
    const current = version.assumptionValues[assumption.id] ?? assumption.value;
    const lowVersion: ScenarioVersion = {
      ...version,
      iterations: Math.min(200, version.iterations),
      assumptionValues: { ...version.assumptionValues, [assumption.id]: clamp(current - delta, assumption.min, assumption.max) },
    };
    const highVersion: ScenarioVersion = {
      ...version,
      iterations: Math.min(200, version.iterations),
      assumptionValues: { ...version.assumptionValues, [assumption.id]: clamp(current + delta, assumption.min, assumption.max) },
    };
    const lowDecision = { ...decision, versions: [...decision.versions.filter((entry) => entry.id !== version.id), lowVersion] };
    const highDecision = { ...decision, versions: [...decision.versions.filter((entry) => entry.id !== version.id), highVersion] };
    const lowRun = runScenario(lowDecision, version.id);
    const highRun = runScenario(highDecision, version.id);
    const lowScore = lowRun.outcomes.find((outcome) => outcome.alternativeId === selectedAlternativeId)?.score ?? baseline;
    const highScore = highRun.outcomes.find((outcome) => outcome.alternativeId === selectedAlternativeId)?.score ?? baseline;
    const lowScoreDelta = round(lowScore - baseline, 1);
    const highScoreDelta = round(highScore - baseline, 1);
    return {
      assumptionId: assumption.id,
      assumptionName: assumption.name,
      lowScoreDelta,
      highScoreDelta,
      magnitude: round(Math.max(Math.abs(lowScoreDelta), Math.abs(highScoreDelta)), 1),
    };
  }).sort((a, b) => b.magnitude - a.magnitude);
}

export function compareVersions(decision: StrategyDecision, previousVersionId: string, currentVersionId: string): VersionDifference[] {
  const previous = decision.versions.find((entry) => entry.id === previousVersionId);
  const current = decision.versions.find((entry) => entry.id === currentVersionId);
  if (!previous || !current) return [];
  return decision.assumptions.map((assumption) => {
    const previousValue = previous.assumptionValues[assumption.id] ?? assumption.value;
    const currentValue = current.assumptionValues[assumption.id] ?? assumption.value;
    return {
      assumptionId: assumption.id,
      assumptionName: assumption.name,
      previousValue: round(previousValue),
      currentValue: round(currentValue),
      delta: round(currentValue - previousValue),
    };
  }).filter((entry) => Math.abs(entry.delta) > Number.EPSILON);
}

function temporaryVersion(decision: StrategyDecision, assumptionValues: Record<string, number>, suffix: string, iterations = 220): ScenarioVersion {
  const active = decision.versions.find((entry) => entry.id === decision.activeVersionId) ?? decision.versions[decision.versions.length - 1];
  if (!active) throw new Error('A scenario version is required before stress testing.');
  return {
    ...active,
    id: `${active.id}-${suffix}`,
    label: suffix,
    iterations: Math.min(active.iterations, iterations),
    assumptionValues: {
      ...active.assumptionValues,
      ...assumptionValues,
    },
  };
}

export type ScenarioSetComparison = {
  scenarioSet: ScenarioSet;
  run: ScenarioRun;
  leaderName: string;
  leaderScore: number;
  runnerUpScore: number;
  margin: number;
  guardrailPass: boolean;
};

export function compareScenarioSets(decision: StrategyDecision): ScenarioSetComparison[] {
  return decision.scenarioSets.map((scenarioSet) => {
    const version = temporaryVersion(decision, scenarioSet.assumptionValues, `set-${scenarioSet.id}`, 260);
    const candidate = {
      ...decision,
      versions: [...decision.versions, version],
      activeVersionId: version.id,
      assumptions: decision.assumptions.map((assumption) => ({
        ...assumption,
        value: scenarioSet.assumptionValues[assumption.id] ?? assumption.value,
      })),
    };
    const run = runScenario(candidate, version.id);
    const ranked = [...run.outcomes].sort((a, b) => {
      if (a.guardrailPass !== b.guardrailPass) return a.guardrailPass ? -1 : 1;
      return b.score - a.score;
    });
    const leader = ranked[0];
    const runnerUp = ranked[1];
    return {
      scenarioSet,
      run,
      leaderName: decision.alternatives.find((alternative) => alternative.id === leader?.alternativeId)?.name ?? 'No eligible alternative',
      leaderScore: leader?.score ?? 0,
      runnerUpScore: runnerUp?.score ?? 0,
      margin: round((leader?.score ?? 0) - (runnerUp?.score ?? 0), 1),
      guardrailPass: Boolean(leader?.guardrailPass),
    };
  });
}

function assumptionImpactMagnitude(decision: StrategyDecision, assumption: Assumption) {
  return assumption.impacts.reduce((sum, impact) => {
    const metric = decision.metrics.find((entry) => entry.id === impact.metricId);
    return sum + Math.abs(impact.effectAtMax - impact.effectAtMin) * (metric?.weight ?? 0);
  }, 0);
}

export type StabilityCell = {
  xAssumptionId: string;
  yAssumptionId: string;
  xState: 'low' | 'base' | 'high';
  yState: 'low' | 'base' | 'high';
  xValue: number;
  yValue: number;
  leaderId: string;
  leaderName: string;
  guardrailPass: boolean;
};

export type StabilityMap = {
  xAssumption: Assumption | null;
  yAssumption: Assumption | null;
  cells: StabilityCell[];
  distinctLeaderIds: string[];
  baselineLeaderId: string;
};

export type StabilitySurfaceCell = {
  xIndex: number;
  yIndex: number;
  xValue: number;
  yValue: number;
  leaderId: string;
  leaderName: string;
  leaderScore: number;
  margin: number;
  guardrailPass: boolean;
};

export type StabilitySurface = {
  xAssumption: Assumption | null;
  yAssumption: Assumption | null;
  steps: number;
  cells: StabilitySurfaceCell[];
  baselineLeaderId: string;
  distinctLeaderIds: string[];
};

function selectBoundaryPair(decision: StrategyDecision) {
  if (decision.assumptions.length < 2) return { xAssumption: decision.assumptions[0] ?? null, yAssumption: null };
  const candidates: Array<{ xAssumption: Assumption; yAssumption: Assumption; score: number }> = [];
  const states: Array<'low' | 'base' | 'high'> = ['low', 'base', 'high'];

  for (let xIndex = 0; xIndex < decision.assumptions.length; xIndex += 1) {
    for (let yIndex = xIndex + 1; yIndex < decision.assumptions.length; yIndex += 1) {
      const xAssumption = decision.assumptions[xIndex];
      const yAssumption = decision.assumptions[yIndex];
      const leaders = new Set<string>();
      const guardrailStates = new Set<boolean>();
      let tightestMargin = Number.POSITIVE_INFINITY;

      for (const yState of states) {
        for (const xState of states) {
          const version = temporaryVersion(decision, {
            [xAssumption.id]: stateValue(xAssumption, xState),
            [yAssumption.id]: stateValue(yAssumption, yState),
          }, `boundary-probe-${xIndex}-${yIndex}-${xState}-${yState}`, 70);
          const candidate = { ...decision, versions: [...decision.versions, version], activeVersionId: version.id };
          const run = runScenario(candidate, version.id);
          const ranked = [...run.outcomes].sort((a, b) => {
            if (a.guardrailPass !== b.guardrailPass) return a.guardrailPass ? -1 : 1;
            return b.score - a.score;
          });
          leaders.add(run.recommendedAlternativeId);
          guardrailStates.add(Boolean(ranked[0]?.guardrailPass));
          tightestMargin = Math.min(tightestMargin, Math.abs((ranked[0]?.score ?? 0) - (ranked[1]?.score ?? 0)));
        }
      }

      const impact = assumptionImpactMagnitude(decision, xAssumption) + assumptionImpactMagnitude(decision, yAssumption);
      const score = leaders.size * 1000 + guardrailStates.size * 140 + Math.max(0, 100 - tightestMargin) + impact * 10;
      candidates.push({ xAssumption, yAssumption, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? { xAssumption: decision.assumptions[0], yAssumption: decision.assumptions[1] };
}

function stateValue(assumption: Assumption, state: 'low' | 'base' | 'high') {
  if (state === 'low') return assumption.min;
  if (state === 'high') return assumption.max;
  return assumption.value;
}

export function calculateStabilityMap(decision: StrategyDecision): StabilityMap {
  const rankedAssumptions = [...decision.assumptions]
    .sort((a, b) => assumptionImpactMagnitude(decision, b) - assumptionImpactMagnitude(decision, a));
  const xAssumption = rankedAssumptions[0] ?? null;
  const yAssumption = rankedAssumptions[1] ?? rankedAssumptions[0] ?? null;
  if (!xAssumption || !yAssumption) {
    return { xAssumption, yAssumption, cells: [], distinctLeaderIds: [], baselineLeaderId: runScenario(decision).recommendedAlternativeId };
  }
  const states: Array<'low' | 'base' | 'high'> = ['low', 'base', 'high'];
  const cells: StabilityCell[] = [];
  for (const yState of states) {
    for (const xState of states) {
      const xValue = stateValue(xAssumption, xState);
      const yValue = stateValue(yAssumption, yState);
      const version = temporaryVersion(decision, { [xAssumption.id]: xValue, [yAssumption.id]: yValue }, `stability-${xState}-${yState}`, 160);
      const candidate = { ...decision, versions: [...decision.versions, version], activeVersionId: version.id };
      const run = runScenario(candidate, version.id);
      const leader = run.outcomes.find((outcome) => outcome.alternativeId === run.recommendedAlternativeId);
      cells.push({
        xAssumptionId: xAssumption.id,
        yAssumptionId: yAssumption.id,
        xState,
        yState,
        xValue,
        yValue,
        leaderId: run.recommendedAlternativeId,
        leaderName: decision.alternatives.find((alternative) => alternative.id === run.recommendedAlternativeId)?.name ?? 'None',
        guardrailPass: Boolean(leader?.guardrailPass),
      });
    }
  }
  const baselineLeaderId = runScenario(decision).recommendedAlternativeId;
  return {
    xAssumption,
    yAssumption,
    cells,
    distinctLeaderIds: [...new Set(cells.map((cell) => cell.leaderId).filter(Boolean))],
    baselineLeaderId,
  };
}

export function calculateStabilitySurface(decision: StrategyDecision, steps = 7): StabilitySurface {
  const safeSteps = Math.max(3, Math.min(9, Math.round(steps)));
  const { xAssumption, yAssumption } = selectBoundaryPair(decision);
  const baselineLeaderId = runScenario(decision).recommendedAlternativeId;
  if (!xAssumption || !yAssumption) return { xAssumption, yAssumption, steps: safeSteps, cells: [], baselineLeaderId, distinctLeaderIds: [] };

  const cells: StabilitySurfaceCell[] = [];
  for (let yIndex = safeSteps - 1; yIndex >= 0; yIndex -= 1) {
    for (let xIndex = 0; xIndex < safeSteps; xIndex += 1) {
      const xRatio = xIndex / (safeSteps - 1);
      const yRatio = yIndex / (safeSteps - 1);
      const xValue = xAssumption.min + (xAssumption.max - xAssumption.min) * xRatio;
      const yValue = yAssumption.min + (yAssumption.max - yAssumption.min) * yRatio;
      const version = temporaryVersion(decision, { [xAssumption.id]: xValue, [yAssumption.id]: yValue }, `surface-${xIndex}-${yIndex}`, 90);
      const candidate = { ...decision, versions: [...decision.versions, version], activeVersionId: version.id };
      const run = runScenario(candidate, version.id);
      const ranked = [...run.outcomes].sort((a, b) => {
        if (a.guardrailPass !== b.guardrailPass) return a.guardrailPass ? -1 : 1;
        return b.score - a.score;
      });
      const leader = ranked[0];
      const runnerUp = ranked[1];
      cells.push({
        xIndex,
        yIndex,
        xValue: round(xValue, 1),
        yValue: round(yValue, 1),
        leaderId: run.recommendedAlternativeId,
        leaderName: decision.alternatives.find((alternative) => alternative.id === run.recommendedAlternativeId)?.name ?? 'None',
        leaderScore: leader?.score ?? 0,
        margin: round((leader?.score ?? 0) - (runnerUp?.score ?? 0), 1),
        guardrailPass: Boolean(leader?.guardrailPass),
      });
    }
  }
  return {
    xAssumption,
    yAssumption,
    steps: safeSteps,
    cells,
    baselineLeaderId,
    distinctLeaderIds: [...new Set(cells.map((cell) => cell.leaderId).filter(Boolean))],
  };
}
