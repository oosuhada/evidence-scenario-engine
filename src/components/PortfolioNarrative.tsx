import { useMemo, useState } from 'react';
import { Database, FlaskConical, GitCompareArrows, Server, UserCheck } from 'lucide-react';
import { createTemplateDecision } from '../decision-model/factories';
import type { Assumption, StrategyDecision } from '../decision-model/types';
import { calculateStabilityMap, runScenario } from '../scenario-engine/engine';

const story = [
  ['BEFORE', 'Scenario decks presented a number, but the assumptions that made it true were hard to interrogate.'],
  ['PROBLEM', 'A recommendation without its switching conditions creates false certainty.'],
  ['INSIGHT', 'Decision support should show where the recommendation changes, not only which option currently wins.'],
  ['ARCHITECTURE', 'Explicit assumptions feed a deterministic engine; evidence, sensitivity, versions, and guardrails stay separate.'],
  ['INTERACTION', 'Move assumptions, compare scenario sets, inspect leader-switch regions, then turn weak assumptions into investigations.'],
  ['RESULT', 'The model becomes a stress-testing workbench and a record of why a human made the decision.'],
];

const series = [
  ['01', 'Research', 'https://signals.oosu.dev/'],
  ['02', 'Decisions', 'https://scenario.oosu.dev/'],
  ['03', 'Generative UI', 'https://decision.oosu.dev/'],
  ['04', 'Memory', 'https://memory.oosu.dev/'],
] as const;

function withAssumption(decision: StrategyDecision, assumption: Assumption, value: number) {
  const activeId = decision.activeVersionId;
  return {
    ...decision,
    assumptions: decision.assumptions.map((item) => item.id === assumption.id ? { ...item, value } : item),
    versions: decision.versions.map((version) => version.id === activeId ? {
      ...version,
      iterations: Math.min(version.iterations, 160),
      assumptionValues: { ...version.assumptionValues, [assumption.id]: value },
    } : version),
  };
}

function findSwitchingAssumption(decision: StrategyDecision) {
  for (const assumption of decision.assumptions) {
    const samples = Array.from({ length: 17 }, (_, index) => assumption.min + (assumption.max - assumption.min) * (index / 16));
    const leaders = samples.map((value) => runScenario(withAssumption(decision, assumption, value)).recommendedAlternativeId);
    const firstSwitch = leaders.findIndex((leader, index) => index > 0 && leader !== leaders[index - 1]);
    if (firstSwitch > 0) {
      return {
        assumption,
        initialValue: (samples[firstSwitch - 1] + samples[firstSwitch]) / 2,
        switchRange: [samples[firstSwitch - 1], samples[firstSwitch]] as const,
      };
    }
  }
  const assumption = decision.assumptions[0];
  return { assumption, initialValue: assumption?.value ?? 50, switchRange: null };
}

export function PortfolioNarrative() {
  const decision = useMemo(() => createTemplateDecision('product-launch'), []);
  const probe = useMemo(() => findSwitchingAssumption(decision), [decision]);
  const [assumptionValue, setAssumptionValue] = useState(probe.initialValue);
  const stability = useMemo(() => calculateStabilityMap(decision), [decision]);
  const result = useMemo(() => {
    if (!probe.assumption) return null;
    const candidate = withAssumption(decision, probe.assumption, assumptionValue);
    const run = runScenario(candidate);
    const ranked = [...run.outcomes].sort((a, b) => {
      if (a.guardrailPass !== b.guardrailPass) return a.guardrailPass ? -1 : 1;
      return b.score - a.score;
    });
    const name = (id: string) => decision.alternatives.find((alternative) => alternative.id === id)?.name ?? 'No leader';
    return {
      leader: name(ranked[0]?.alternativeId ?? ''),
      leaderScore: ranked[0]?.score ?? 0,
      runnerUp: name(ranked[1]?.alternativeId ?? ''),
      runnerUpScore: ranked[1]?.score ?? 0,
      guardrailPass: Boolean(ranked[0]?.guardrailPass),
      modelVersion: run.modelVersion,
    };
  }, [assumptionValue, decision, probe.assumption]);

  return (
    <section className="portfolio-narrative" aria-labelledby="scenario-case-title">
      <div className="portfolio-thesis-row"><span>INSPECTABLE AI SYSTEMS / 02</span><p>A model should expose the assumptions that make its recommendation true—and the boundary where it stops being true.</p></div>

      <div className="scenario-killer">
        <div className="killer-copy"><span>KILLER INTERACTION / RUN THE REAL ENGINE</span><h2 id="scenario-case-title">Do not just show the winner. Move a real model assumption and watch the recommendation change.</h2><p>This control calls the same deterministic scenario engine used by the full workbench. The selected assumption is discovered by probing configured ranges for an actual leader switch.</p></div>
        {probe.assumption && result ? <div className="flip-lab" data-engine="sp-deterministic-2.0.0">
          <div className="flip-heading"><span>{probe.assumption.name.toUpperCase()} / CONFIGURED RANGE</span><strong>{assumptionValue.toFixed(1)} {probe.assumption.unit}</strong></div>
          <input aria-label={`Model assumption ${probe.assumption.name}`} type="range" min={probe.assumption.min} max={probe.assumption.max} step={(probe.assumption.max - probe.assumption.min) / 100} value={assumptionValue} onChange={(event) => setAssumptionValue(Number(event.target.value))} />
          <div className="flip-scores"><article className="leader"><span>CURRENT LEADER</span><strong>{result.leader}</strong><small>{result.leaderScore.toFixed(1)} · {result.guardrailPass ? 'guardrails pass' : 'guardrail breach'}</small></article><article><span>RUNNER UP</span><strong>{result.runnerUp}</strong><small>{result.runnerUpScore.toFixed(1)}</small></article></div>
          <div className="flip-result"><span>REAL MODEL STATE</span><strong>{probe.switchRange ? `Leader switch exists between ${probe.switchRange[0].toFixed(1)}–${probe.switchRange[1].toFixed(1)} ${probe.assumption.unit}` : 'Leader remains stable across this single-assumption range'}</strong><p>{result.modelVersion} · seeded uncertainty · guardrail-first ranking</p></div>
          <small>REAL DETERMINISTIC ENGINE · SYNTHETIC TEMPLATE INPUTS · NOT AN EMPIRICAL FORECAST</small>
        </div> : null}
      </div>

      <div className="mini-stability-proof" aria-label="Actual paired-assumption stability map">
        <div><span>ACTUAL 3×3 STABILITY MAP</span><strong>{stability.xAssumption?.name} × {stability.yAssumption?.name}</strong><p>{stability.distinctLeaderIds.length} distinct model leader{stability.distinctLeaderIds.length === 1 ? '' : 's'} across paired low/base/high states.</p></div>
        <div className="mini-stability-grid">{stability.cells.map((cell) => <article key={`${cell.xState}-${cell.yState}`} className={cell.leaderId !== stability.baselineLeaderId ? 'switch' : ''}><span>{cell.xState[0].toUpperCase()}×{cell.yState[0].toUpperCase()}</span><b>{cell.leaderName}</b><small>{cell.leaderId !== stability.baselineLeaderId ? 'SWITCH' : 'BASE'}</small></article>)}</div>
      </div>

      <details className="engineering-case">
        <summary><span>ENGINEERING CASE STUDY</span><b>Why this is not a forecast dashboard</b></summary>
        <div className="engineering-case-body">
          <div className="approach-compare"><article className="common-approach"><span>COMMON SCENARIO TOOL</span><strong>Inputs → forecast → polished chart</strong><p>Assumptions disappear behind the output and the viewer has to infer how fragile the recommendation is.</p></article><div className="compare-vs">VS</div><article className="our-approach"><span>THIS SYSTEM</span><strong>Assumptions → deterministic model → stability → investigation</strong><p>Uncertainty remains visible, recommendation switches are mapped, and weak/high-impact assumptions become evidence work.</p></article></div>

          <div className="system-architecture" id="architecture"><header><span>ARCHITECTURE / EXECUTION BOUNDARIES</span><h3>Critique can be generative. Calculation remains deterministic and reproducible.</h3></header><div className="architecture-lanes">
            <article><GitCompareArrows size={15} /><span>INTERACTION</span><b>React workbench</b><small>assumptions · scenario sets · sensitivity · versions</small></article><i>→</i>
            <article><FlaskConical size={15} /><span>DOMAIN ENGINE</span><b>Deterministic model</b><small>seeded runs · guardrails · utility · stability map</small></article><i>→</i>
            <article><Database size={15} /><span>DECISION RECORD</span><b>Persisted versions</b><small>evidence · rationale · revisit conditions · investigations</small></article>
            <article className="architecture-side"><Server size={15} /><span>PERSISTENCE</span><b>FastAPI + PostgreSQL</b><small>decision/version state independent from presentation</small></article>
            <article className="architecture-side human"><UserCheck size={15} /><span>HUMAN GATE</span><b>Recommendation ≠ decision</b><small>model output can be challenged; only a human records commitment</small></article>
          </div></div>

          <div className="case-story">{story.map(([label, body], index) => <article key={label}><span>{String(index + 1).padStart(2, '0')} / {label}</span><p>{body}</p></article>)}</div>
          <nav className="series-nav" aria-label="Inspectable AI Systems series">{series.map(([index, label, href]) => <a key={index} className={index === '02' ? 'active' : ''} href={href}><span>{index}</span><b>{label}</b></a>)}</nav>
        </div>
      </details>
    </section>
  );
}
