import type { SensitivityResult } from '../../decision-model/types';

export function SensitivityTornado({ rows }: { rows: SensitivityResult[] }) {
  const maxMagnitude = Math.max(...rows.map((row) => row.magnitude), 1);
  return (
    <section className="analysis-card" aria-labelledby="sensitivity-heading">
      <div className="section-heading">
        <div><span>02 / SENSITIVITY</span><h2 id="sensitivity-heading">Assumption tornado</h2></div>
        <p>±10% assumption-range perturbation against the selected recommendation.</p>
      </div>
      <div className="tornado-chart" role="img" aria-label="Sensitivity tornado chart">
        {rows.length === 0 ? <div className="empty-inline">Add assumptions to calculate sensitivity.</div> : rows.slice(0, 8).map((row) => {
          const lowWidth = Math.abs(row.lowScoreDelta) / maxMagnitude * 50;
          const highWidth = Math.abs(row.highScoreDelta) / maxMagnitude * 50;
          return (
            <div className="tornado-row" key={row.assumptionId}>
              <span>{row.assumptionName}</span>
              <div className="tornado-track">
                <i className="tornado-center" />
                <b className="tornado-low" style={{ width: `${lowWidth}%` }} title={`${row.lowScoreDelta}`} />
                <b className="tornado-high" style={{ width: `${highWidth}%` }} title={`${row.highScoreDelta}`} />
              </div>
              <small>{row.lowScoreDelta > 0 ? '+' : ''}{row.lowScoreDelta} / {row.highScoreDelta > 0 ? '+' : ''}{row.highScoreDelta}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
