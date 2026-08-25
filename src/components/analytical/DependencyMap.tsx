import type { StrategyDecision } from '../../decision-model/types';

export function DependencyMap({ decision }: { decision: StrategyDecision }) {
  const width = 760;
  const height = Math.max(260, Math.max(decision.assumptions.length, decision.metrics.length) * 58 + 40);
  const assumptionY = (index: number) => 36 + index * ((height - 72) / Math.max(1, decision.assumptions.length - 1));
  const metricY = (index: number) => 36 + index * ((height - 72) / Math.max(1, decision.metrics.length - 1));
  return (
    <section className="analysis-card" aria-labelledby="dependency-heading">
      <div className="section-heading">
        <div><span>03 / DEPENDENCIES</span><h2 id="dependency-heading">Assumption dependency map</h2></div>
        <p>Edges come directly from configured metric impacts.</p>
      </div>
      <div className="dependency-map-wrap">
        <svg className="dependency-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Assumption to metric dependency map">
          {decision.assumptions.flatMap((assumption, assumptionIndex) => assumption.impacts.map((impact) => {
            const metricIndex = decision.metrics.findIndex((metric) => metric.id === impact.metricId);
            if (metricIndex < 0) return null;
            const magnitude = Math.max(Math.abs(impact.effectAtMin), Math.abs(impact.effectAtMax));
            return (
              <path
                key={`${assumption.id}-${impact.metricId}`}
                d={`M 210 ${assumptionY(assumptionIndex)} C 330 ${assumptionY(assumptionIndex)}, 430 ${metricY(metricIndex)}, 550 ${metricY(metricIndex)}`}
                className={impact.effectAtMax >= impact.effectAtMin ? 'positive' : 'negative'}
                style={{ strokeWidth: Math.max(1, magnitude * 8) }}
              />
            );
          }))}
          {decision.assumptions.map((assumption, index) => (
            <g key={assumption.id} transform={`translate(10 ${assumptionY(index) - 17})`}>
              <rect width="200" height="34" rx="4" />
              <text x="10" y="21">{assumption.name}</text>
            </g>
          ))}
          {decision.metrics.map((metric, index) => (
            <g key={metric.id} transform={`translate(550 ${metricY(index) - 17})`}>
              <rect width="200" height="34" rx="4" />
              <text x="10" y="21">{metric.name}</text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
