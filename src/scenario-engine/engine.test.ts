import { describe, expect, it } from 'vitest';
import { cloneAsNewVersion, createSampleDecision } from '../decision-model/factories';
import { calculateSensitivity, compareVersions, runScenario } from './engine';

describe('deterministic scenario engine', () => {
  it('reproduces the same numeric outcome for the same seed and inputs', () => {
    const decision = createSampleDecision();
    const first = runScenario(decision);
    const second = runScenario(decision);

    expect(second.seed).toBe(first.seed);
    expect(second.iterations).toBe(first.iterations);
    expect(second.recommendedAlternativeId).toBe(first.recommendedAlternativeId);
    expect(second.outcomes).toEqual(first.outcomes);
  });

  it('calculates bounded outcome ranges and traces formulas', () => {
    const decision = createSampleDecision();
    const run = runScenario(decision);

    for (const outcome of run.outcomes) {
      expect(outcome.uncertainty).toBeGreaterThan(0);
      for (const metric of outcome.metricOutcomes) {
        expect(metric.low).toBeLessThanOrEqual(metric.expected * 2);
        expect(metric.high).toBeGreaterThanOrEqual(metric.low);
        expect(metric.samples).toHaveLength(run.iterations);
        expect(metric.formula).toContain('horizonMultiplier');
      }
    }
  });

  it('returns sensitivity ranked by magnitude', () => {
    const decision = createSampleDecision();
    const run = runScenario(decision);
    const sensitivity = calculateSensitivity(decision, run);

    expect(sensitivity).toHaveLength(decision.assumptions.length);
    for (let index = 1; index < sensitivity.length; index += 1) {
      expect(sensitivity[index - 1].magnitude).toBeGreaterThanOrEqual(sensitivity[index].magnitude);
    }
  });

  it('versions assumptions and reports the difference', () => {
    const decision = createSampleDecision();
    const previous = decision.activeVersionId;
    decision.assumptions[0].value += 7;
    const versioned = cloneAsNewVersion(decision, 'Evidence refresh');
    const differences = compareVersions(versioned, previous, versioned.activeVersionId);

    expect(versioned.versions).toHaveLength(2);
    expect(differences.some((item) => item.assumptionId === decision.assumptions[0].id && item.delta === 7)).toBe(true);
  });
});
