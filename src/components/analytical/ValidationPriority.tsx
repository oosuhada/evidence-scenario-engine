import { AlertTriangle, CheckCircle2, FlaskConical, Plus } from 'lucide-react';
import type { SensitivityResult, StrategyDecision } from '../../decision-model/types';

type Props = {
  decision: StrategyDecision;
  sensitivity: SensitivityResult[];
  onCreateInvestigation?: (assumptionId: string) => void;
  readOnly?: boolean;
};

export function ValidationPriority({ decision, sensitivity, onCreateInvestigation, readOnly = false }: Props) {
  const sensitivityById = new Map(sensitivity.map((item) => [item.assumptionId, item]));
  const rows = decision.assumptions.map((assumption) => {
    const linked = decision.evidence.filter((item) => item.assumptionIds.includes(assumption.id));
    const evidenceStrength = linked.length === 0
      ? 0
      : linked.reduce((sum, item) => sum + item.strength * item.relevance, 0) / linked.length;
    const modelSensitivity = sensitivityById.get(assumption.id)?.magnitude ?? 0;
    const uncertainty = Math.max(1 - assumption.confidence, assumption.unresolved ? 0.65 : 0);
    const rawPriority = modelSensitivity * (0.35 + (1 - evidenceStrength) * 0.65) * (0.5 + uncertainty * 0.5);
    return {
      id: assumption.id,
      name: assumption.name,
      unresolved: assumption.unresolved,
      confidence: assumption.confidence,
      modelSensitivity,
      evidenceStrength,
      linkedCount: linked.length,
      rawPriority,
    };
  }).sort((a, b) => b.rawPriority - a.rawPriority);

  const maxPriority = Math.max(...rows.map((row) => row.rawPriority), 1);

  return (
    <section className="analysis-card validation-priority" aria-labelledby="validation-priority-heading">
      <div className="section-heading">
        <div><span>02 / VALIDATION PRIORITY</span><h2 id="validation-priority-heading">What should be tested next?</h2></div>
        <p>Ranks assumptions by model sensitivity, weak evidence coverage, and unresolved uncertainty. It is a transparent triage heuristic, not a probability.</p>
      </div>
      <div className="validation-formula"><FlaskConical size={13} /><code>sensitivity × evidence gap × uncertainty</code><span>Higher means: validate before increasing commitment.</span></div>
      <div className="validation-list">
        {rows.map((row, index) => {
          const relative = Math.round((row.rawPriority / maxPriority) * 100);
          const evidencePct = Math.round(row.evidenceStrength * 100);
          return (
            <article key={row.id}>
              <div className="validation-rank">{String(index + 1).padStart(2, '0')}</div>
              <div className="validation-copy">
                <strong>{row.name}</strong>
                <span>{row.linkedCount} evidence · {evidencePct}% weighted support · {Math.round(row.confidence * 100)}% assumption confidence</span>
              </div>
              <div className="validation-bar" aria-label={`${row.name} relative validation priority ${relative} percent`}><i><b style={{ width: `${relative}%` }} /></i><strong>{relative}</strong></div>
              <div className={`validation-state ${row.unresolved || row.linkedCount === 0 ? 'needs-work' : ''}`}>
                {row.unresolved || row.linkedCount === 0 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                <span>{row.linkedCount === 0 ? 'NO EVIDENCE' : row.unresolved ? 'UNRESOLVED' : `SENS. ${row.modelSensitivity.toFixed(1)}`}</span>
              </div>
              {!readOnly && onCreateInvestigation ? <button className="validation-request" type="button" onClick={() => onCreateInvestigation(row.id)}><Plus size={11} /> Investigation</button> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
