import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSampleDecision } from '../decision-model/factories';
import { runScenario } from '../scenario-engine/engine';
import { runSkeptic } from './adapter';

describe('skeptic adapter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('falls back deterministically when the provider is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const decision = createSampleDecision();
    const run = runScenario(decision);
    const result = await runSkeptic({
      decision,
      run,
      selectedAlternativeId: run.recommendedAlternativeId,
    });

    expect(result.source).toBe('deterministic-fallback');
    expect(result.falsificationTest.length).toBeGreaterThan(20);
  });
});
