import type { AlternativeOutcome, StrategyDecision } from '../../decision-model/types';

export function CalculationBreakdown({ decision, outcome }: { decision: StrategyDecision; outcome: AlternativeOutcome }) {
  return (
    <section className="analysis-card" aria-labelledby="calculation-heading">
      <div className="section-heading">
        <div><span>04 / TRACE</span><h2 id="calculation-heading">Calculation breakdown</h2></div>
        <p>Inputs and formulas behind every displayed output.</p>
      </div>
      <div className="calculation-grid">
        {outcome.metricOutcomes.map((metricOutcome) => {
          const metric = decision.metrics.find((entry) => entry.id === metricOutcome.metricId);
          return (
            <details key={metricOutcome.metricId}>
              <summary><span>{metric?.name ?? metricOutcome.metricId}</span><strong>{metricOutcome.expected.toFixed(1)} {metric?.unit}</strong></summary>
              <code>{metricOutcome.formula}</code>
              <div className="calculation-range"><span>P10-like modeled bound {metricOutcome.low.toFixed(1)}</span><span>P90-like modeled bound {metricOutcome.high.toFixed(1)}</span></div>
              <ul>
                {metricOutcome.inputTrace.map((trace) => <li key={trace.label}><span>{trace.label}: {trace.value}</span><b>{trace.contribution >= 0 ? '+' : ''}{(trace.contribution * 100).toFixed(1)}%</b></li>)}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
