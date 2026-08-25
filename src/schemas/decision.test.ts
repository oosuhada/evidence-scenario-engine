import { describe, expect, it } from 'vitest';
import { createSampleDecision } from '../decision-model/factories';
import { skepticResultSchema, strategyDecisionSchema } from './decision';

describe('domain schemas', () => {
  it('accepts a complete decision and rejects an out-of-range assumption', () => {
    const decision = createSampleDecision();
    expect(strategyDecisionSchema.safeParse(decision).success).toBe(true);

    decision.assumptions[0].value = decision.assumptions[0].max + 1;
    expect(strategyDecisionSchema.safeParse(decision).success).toBe(false);
  });

  it('keeps skeptic output bounded to the structured contract', () => {
    const parsed = skepticResultSchema.parse({
      vulnerableAssumption: 'A',
      missingEvidence: 'B',
      counterScenario: 'C',
      falsificationTest: 'D',
      mitigation: 'E',
      attemptedNumericOverride: 999,
    });
    expect(parsed).not.toHaveProperty('attemptedNumericOverride');
  });
});
