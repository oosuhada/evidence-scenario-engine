import type { ScenarioRun, StrategyDecision } from '../../decision-model/types';

export function OutcomeComparison({ decision, run, selectedAlternativeId, onSelect }: {
  decision: StrategyDecision;
  run: ScenarioRun;
  selectedAlternativeId: string;
  onSelect: (alternativeId: string) => void;
}) {
  return (
    <section className="analysis-card comparison-card" aria-labelledby="comparison-heading">
      <div className="section-heading">
        <div><span>01 / OUTCOME MATRIX</span><h2 id="comparison-heading">Scenario comparison</h2></div>
        <p>Same deterministic run used by the 3D prism.</p>
      </div>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Alternative</th>
              <th>Score</th>
              {decision.metrics.map((metric) => <th key={metric.id}>{metric.name}</th>)}
              <th>Uncertainty</th>
              <th>Guardrail</th>
            </tr>
          </thead>
          <tbody>
            {run.outcomes.map((outcome) => {
              const alternative = decision.alternatives.find((entry) => entry.id === outcome.alternativeId);
              return (
                <tr key={outcome.alternativeId} className={selectedAlternativeId === outcome.alternativeId ? 'selected' : ''}>
                  <th>
                    <button type="button" onClick={() => onSelect(outcome.alternativeId)}>
                      <span>{alternative?.name ?? outcome.alternativeId}</span>
                      <small>{alternative?.description}</small>
                    </button>
                  </th>
                  <td><strong>{outcome.score.toFixed(1)}</strong></td>
                  {decision.metrics.map((metric) => {
                    const metricOutcome = outcome.metricOutcomes.find((entry) => entry.metricId === metric.id);
                    return (
                      <td key={metric.id}>
                        <span>{metricOutcome?.expected.toFixed(1) ?? '—'} {metric.unit}</span>
                        <small>{metricOutcome ? `${metricOutcome.low.toFixed(1)}–${metricOutcome.high.toFixed(1)}` : ''}</small>
                      </td>
                    );
                  })}
                  <td>{outcome.uncertainty.toFixed(1)}%</td>
                  <td><span className={`status-chip ${outcome.guardrailPass ? 'pass' : 'breach'}`}>{outcome.guardrailPass ? 'PASS' : 'BREACH'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
