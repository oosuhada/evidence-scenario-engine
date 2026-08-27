import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Gauge, GitCompareArrows } from 'lucide-react';
import type { ScenarioRun, StrategyDecision } from '../../decision-model/types';
import { runScenario } from '../../scenario-engine/engine';

type Props = { decision: StrategyDecision; run: ScenarioRun };

export function DecisionReadiness({ decision, run }: Props) {
  const leader = decision.alternatives.find((item) => item.id === run.recommendedAlternativeId);
  const activeVersion = decision.versions.find((item) => item.id === run.versionId);
  const unresolved = decision.assumptions.filter((item) => item.unresolved);
  const noEvidence = decision.assumptions.filter((assumption) => !decision.evidence.some((item) => item.assumptionIds.includes(assumption.id)));
  const guardrailBreaches = run.outcomes.filter((outcome) => !outcome.guardrailPass);
  const recorded = decision.decisionRecords.some((record) => record.versionId === run.versionId);

  const thresholds = useMemo(() => {
    if (!activeVersion || !run.recommendedAlternativeId) return [];
    return decision.assumptions.map((assumption) => {
      const current = activeVersion.assumptionValues[assumption.id] ?? assumption.value;
      const steps = 20;
      const candidates = Array.from({ length: steps + 1 }, (_, index) => assumption.min + ((assumption.max - assumption.min) * index) / steps)
        .filter((value) => Math.abs(value - current) > Number.EPSILON);
      const flips = candidates.map((value) => {
        const probeVersion = {
          ...activeVersion,
          iterations: Math.min(activeVersion.iterations, 80),
          assumptionValues: { ...activeVersion.assumptionValues, [assumption.id]: value },
        };
        const probeDecision = { ...decision, versions: decision.versions.map((version) => version.id === activeVersion.id ? probeVersion : version) };
        const probe = runScenario(probeDecision, activeVersion.id);
        return { value, leaderId: probe.recommendedAlternativeId };
      }).filter((candidate) => candidate.leaderId && candidate.leaderId !== run.recommendedAlternativeId)
        .sort((a, b) => Math.abs(a.value - current) - Math.abs(b.value - current));
      const nearest = flips[0];
      return {
        assumption,
        current,
        nearest,
        alternate: nearest ? decision.alternatives.find((item) => item.id === nearest.leaderId) : undefined,
        distancePct: nearest && assumption.max !== assumption.min ? Math.round((Math.abs(nearest.value - current) / (assumption.max - assumption.min)) * 100) : null,
      };
    }).sort((a, b) => (a.distancePct ?? 999) - (b.distancePct ?? 999));
  }, [activeVersion, decision, run.recommendedAlternativeId]);

  const checks = [
    { label: 'Unresolved assumptions', value: unresolved.length, ok: unresolved.length === 0, detail: unresolved.length ? unresolved.map((item) => item.name).slice(0, 3).join(' · ') : 'All assumptions explicitly resolved.' },
    { label: 'Assumptions without evidence', value: noEvidence.length, ok: noEvidence.length === 0, detail: noEvidence.length ? noEvidence.map((item) => item.name).slice(0, 3).join(' · ') : 'Every assumption has at least one linked evidence item.' },
    { label: 'Alternatives breaching guardrails', value: guardrailBreaches.length, ok: guardrailBreaches.length === 0, detail: guardrailBreaches.length ? 'Inspect outcome ranges before commitment.' : 'All alternatives satisfy configured guardrails under current ranges.' },
    { label: 'Decision recorded for version', value: recorded ? 'YES' : 'NO', ok: recorded, detail: recorded ? 'A human rationale is attached to this version.' : 'Recommendation remains advisory until a human records a choice.' },
  ];

  return <section className="analysis-card decision-readiness" aria-labelledby="decision-readiness-heading">
    <div className="section-heading"><div><span>03 / DECISION READINESS</span><h2 id="decision-readiness-heading">How fragile is the current leader?</h2></div><p>Checklist state comes from explicit model configuration. Break-even search probes the configured assumption range and reports where another alternative becomes the model-rule leader.</p></div>
    <div className="readiness-leader"><Gauge size={16} /><div><span>CURRENT MODEL-RULE LEADER</span><strong>{leader?.name ?? 'No leader'}</strong><small>{run.decisionRule}</small></div></div>
    <div className="readiness-checks">{checks.map((check) => <article key={check.label} className={check.ok ? 'ok' : 'attention'}>{check.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}<div><span>{check.label}</span><strong>{check.value}</strong><small>{check.detail}</small></div></article>)}</div>
    <div className="threshold-heading"><GitCompareArrows size={14} /><div><strong>Leader break-even explorer</strong><span>Nearest sampled assumption value that changes the recommended alternative. Grid search only; not a proof of a continuous mathematical threshold.</span></div></div>
    <div className="threshold-table"><div className="threshold-row head"><span>ASSUMPTION</span><span>CURRENT</span><span>NEAREST FLIP</span><span>NEXT LEADER</span><span>DISTANCE</span></div>{thresholds.map((row) => <div className="threshold-row" key={row.assumption.id}><strong>{row.assumption.name}</strong><span>{row.current.toFixed(1)}{row.assumption.unit}</span><span>{row.nearest ? `${row.nearest.value.toFixed(1)}${row.assumption.unit}` : 'stable in range'}</span><span>{row.alternate?.name ?? '—'}</span><b>{row.distancePct === null ? '—' : `${row.distancePct}% of range`}</b></div>)}</div>
  </section>;
}
