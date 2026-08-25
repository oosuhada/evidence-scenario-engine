import type { ScenarioRun, SkepticResult, StrategyDecision } from '../decision-model/types';
import { skepticResultSchema } from '../schemas/decision';

export interface SkepticAdapterInput {
  decision: StrategyDecision;
  run: ScenarioRun;
  selectedAlternativeId: string;
}

function deterministicFallback(input: SkepticAdapterInput): SkepticResult {
  const selected = input.decision.alternatives.find((alternative) => alternative.id === input.selectedAlternativeId);
  const vulnerable = [...input.decision.assumptions]
    .sort((a, b) => (a.confidence + (a.unresolved ? 0 : 0.25)) - (b.confidence + (b.unresolved ? 0 : 0.25)))[0];
  const missingEvidence = vulnerable
    ? input.decision.evidence.some((item) => item.assumptionIds.includes(vulnerable.id))
      ? `Existing evidence for “${vulnerable.name}” is not yet strong enough to resolve the modeled uncertainty. Add an independent source or a direct operational test.`
      : `No evidence item is linked to “${vulnerable.name}”. The model is currently relying on an unsupported assumption.`
    : 'The model has no assumptions to challenge yet.';
  const alternative = input.decision.alternatives.find((entry) => entry.id !== input.selectedAlternativeId);
  const primaryOutcome = input.run.outcomes.find((outcome) => outcome.alternativeId === input.selectedAlternativeId);

  return {
    vulnerableAssumption: vulnerable
      ? `${vulnerable.name} has ${(vulnerable.confidence * 100).toFixed(0)}% confidence${vulnerable.unresolved ? ' and is still unresolved' : ''}.`
      : 'No vulnerable assumption can be identified until assumptions are defined.',
    missingEvidence,
    counterScenario: alternative
      ? `If the weak assumption moves toward its adverse bound, compare “${selected?.name ?? 'selected option'}” against “${alternative.name}” rather than treating the current ranking as stable.`
      : 'Add at least one competing alternative before using the ranking as a decision aid.',
    falsificationTest: vulnerable
      ? `Run a time-boxed test that measures “${vulnerable.name}” directly and pre-commit to revising the scenario if the observed value crosses the adverse 10% sensitivity step.`
      : 'Define a measurable assumption and a threshold that would force the team to revise the scenario.',
    mitigation: primaryOutcome?.guardrailPass
      ? 'Keep the decision reversible: stage the commitment, instrument the weak assumption, and require a versioned rerun before expanding scope.'
      : 'Do not expand scope while a guardrail is breached. Reduce exposure or change the alternative before recording the decision.',
    source: 'deterministic-fallback',
  };
}

export async function runSkeptic(input: SkepticAdapterInput, externalSignal?: AbortSignal): Promise<SkepticResult> {
  const fallback = deterministicFallback(input);
  if (typeof fetch === 'undefined') return fallback;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort('timeout'), 9000);
  const abort = () => controller.abort(externalSignal?.reason ?? 'cancelled');
  externalSignal?.addEventListener('abort', abort, { once: true });

  try {
    const response = await fetch('/api/skeptic', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decisionId: input.decision.id,
        versionId: input.run.versionId,
        selectedAlternativeId: input.selectedAlternativeId,
        assumptions: input.decision.assumptions,
        evidence: input.decision.evidence,
        contradictions: input.decision.evidence.filter((item) => item.stance === 'contradicts'),
        modelLimitations: [
          'Outputs are deterministic model calculations under configured assumptions, not empirical forecasts.',
          'The provider may critique assumptions but may not modify numeric scenario outcomes.',
        ],
      }),
    });
    if (!response.ok) return fallback;
    const parsed = skepticResultSchema.safeParse(await response.json());
    if (!parsed.success) return fallback;
    return { ...parsed.data, source: 'provider' };
  } catch (error) {
    if (externalSignal?.aborted) throw error;
    return fallback;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abort);
  }
}
