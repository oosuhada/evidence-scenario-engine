import { useMemo, useState } from 'react';

const story = [
  ['BEFORE', 'Scenario decks presented a number, but the assumptions that made it true were hard to interrogate.'],
  ['PROBLEM', 'A recommendation without its switching conditions creates false certainty.'],
  ['INSIGHT', 'Decision support should show where the recommendation changes, not only which option currently wins.'],
  ['ARCHITECTURE', 'Explicit assumptions feed a deterministic engine; evidence, sensitivity, versions, and guardrails stay separate.'],
  ['INTERACTION', 'Move assumptions, compare scenario sets, inspect leader-switch regions, then turn weak assumptions into investigations.'],
  ['RESULT', 'The model becomes a stress-testing workbench and a record of why a human made the decision.'],
];

export function PortfolioNarrative() {
  const [readiness, setReadiness] = useState(58);
  const result = useMemo(() => {
    const phased = 52 + readiness * 0.42;
    const broad = 80 - readiness * 0.08;
    return { phased, broad, leader: phased >= broad ? 'PHASED LAUNCH' : 'BROAD LAUNCH', delta: Math.abs(phased - broad) };
  }, [readiness]);

  return (
    <section className="portfolio-narrative" aria-labelledby="scenario-case-title">
      <div className="portfolio-thesis-row"><span>INSPECTABLE AI SYSTEMS / 02</span><p>A model should expose the assumptions that make its recommendation true—and the boundary where it stops being true.</p></div>

      <div className="scenario-killer">
        <div className="killer-copy"><span>KILLER INTERACTION / FIND THE SWITCH</span><h2 id="scenario-case-title">Do not just show the winner. Show when the winner changes.</h2><p>Move one assumption in this synthetic micro-model. The production workbench extends the same idea across named multi-assumption scenario sets and paired-assumption stability maps.</p></div>
        <div className="flip-lab">
          <div className="flip-heading"><span>SYNTHETIC MICRO-MODEL / ADOPTION READINESS</span><strong>{readiness}%</strong></div>
          <input aria-label="Synthetic adoption readiness" type="range" min="20" max="90" value={readiness} onChange={(event) => setReadiness(Number(event.target.value))} />
          <div className="flip-scores"><article className={result.leader === 'PHASED LAUNCH' ? 'leader' : ''}><span>PHASED LAUNCH</span><strong>{result.phased.toFixed(1)}</strong></article><article className={result.leader === 'BROAD LAUNCH' ? 'leader' : ''}><span>BROAD LAUNCH</span><strong>{result.broad.toFixed(1)}</strong></article></div>
          <div className="flip-result"><span>MODEL LEADER</span><strong>{result.leader}</strong><p>Margin {result.delta.toFixed(1)} pts · switch occurs around 56% readiness.</p></div>
          <small>ILLUSTRATIVE FORMULA ONLY · NOT AN EMPIRICAL FORECAST</small>
        </div>
      </div>

      <div className="approach-compare"><article className="common-approach"><span>COMMON SCENARIO TOOL</span><strong>Inputs → forecast → polished chart</strong><p>Assumptions disappear behind the output and the viewer has to infer how fragile the recommendation is.</p></article><div className="compare-vs">VS</div><article className="our-approach"><span>THIS SYSTEM</span><strong>Assumptions → deterministic model → stability → investigation</strong><p>Uncertainty remains visible, recommendation switches are mapped, and weak/high-impact assumptions become evidence work.</p></article></div>

      <div className="architecture-card"><div><span>ARCHITECTURE / DECISION PATH</span><h3>Generation can critique the model. It cannot become the calculation engine.</h3></div><div className="architecture-flow">{['ASSUMPTIONS', 'EVIDENCE', 'DETERMINISTIC ENGINE', 'SCENARIO SETS', 'STABILITY MAP', 'INVESTIGATION', 'HUMAN DECISION'].map((node, index) => <span key={node} className={index === 2 ? 'compute-node' : index === 6 ? 'human-node' : ''}>{node}</span>)}</div></div>

      <div className="case-story">{story.map(([label, body], index) => <article key={label}><span>{String(index + 1).padStart(2, '0')} / {label}</span><p>{body}</p></article>)}</div>
    </section>
  );
}
