import { useMemo, useState } from 'react';
import { Check, Crosshair, GitCompareArrows, Plus, RotateCcw, Save, ScanLine, ShieldAlert, Trash2 } from 'lucide-react';
import type { ScenarioSet, StrategyDecision } from '../../decision-model/types';
import { calculateStabilityMap, calculateStabilitySurface, compareScenarioSets } from '../../scenario-engine/engine';

type Props = {
  decision: StrategyDecision;
  readOnly: boolean;
  onApply: (values: Record<string, number>) => void;
  onSaveScenario: (name: string, rationale: string, revisitConditions: string) => void;
  onUpdateScenario: (id: string, patch: Partial<Pick<ScenarioSet, 'name' | 'rationale' | 'revisitConditions' | 'assumptionValues'>>) => void;
  onRemoveScenario: (id: string) => void;
  onResolveInvestigation: (id: string) => void;
};

function setBadge(kind: ScenarioSet['kind']) {
  return kind === 'base' ? 'BASE' : kind === 'upside' ? 'UPSIDE' : kind === 'downside' ? 'DOWNSIDE' : kind === 'stress' ? 'STRESS' : 'CUSTOM';
}

export function ScenarioWorkbench({
  decision,
  readOnly,
  onApply,
  onSaveScenario,
  onUpdateScenario,
  onRemoveScenario,
  onResolveInvestigation,
}: Props) {
  const [draftName, setDraftName] = useState('Custom scenario');
  const [draftRationale, setDraftRationale] = useState('Captured from the current active assumption values.');
  const [draftRevisit, setDraftRevisit] = useState('Revisit when linked evidence changes a material assumption.');
  const comparisons = useMemo(() => compareScenarioSets(decision), [decision]);
  const stability = useMemo(() => calculateStabilityMap(decision), [decision]);
  const surface = useMemo(() => calculateStabilitySurface(decision, 7), [decision]);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);
  const namedLeaders = [...new Set(comparisons.map((item) => item.run.recommendedAlternativeId).filter(Boolean))];
  const baselineLeader = comparisons.find((item) => item.scenarioSet.kind === 'base')?.run.recommendedAlternativeId ?? comparisons[0]?.run.recommendedAlternativeId ?? '';
  const baselineLeaderName = decision.alternatives.find((item) => item.id === baselineLeader)?.name ?? 'No leader';
  const openInvestigations = decision.investigationItems.filter((item) => item.status === 'open');

  const saveCustom = () => {
    const name = draftName.trim();
    if (!name) return;
    onSaveScenario(name, draftRationale.trim(), draftRevisit.trim());
    setDraftName('Custom scenario');
  };

  return <section className="analysis-card scenario-workbench" aria-labelledby="scenario-workbench-heading">
    <div className="section-heading scenario-workbench-heading">
      <div><span>02 / MULTI-ASSUMPTION STRESS TEST</span><h2 id="scenario-workbench-heading">Scenario sets & recommendation stability</h2></div>
      <p>Named sets change multiple assumptions together. The matrix reports the deterministic leader under each set and the 3×3 stability map shows where the leader changes under paired assumption extremes.</p>
    </div>

    <div className={`stability-summary ${namedLeaders.length > 1 ? 'unstable' : 'stable'}`}>
      {namedLeaders.length > 1 ? <ShieldAlert size={17} /> : <Check size={17} />}
      <div><span>RECOMMENDATION STABILITY</span><strong>{namedLeaders.length <= 1 ? `Stable across ${comparisons.length} named scenarios` : `${namedLeaders.length} different leaders across ${comparisons.length} named scenarios`}</strong><p>Base leader: {baselineLeaderName}. {namedLeaders.length <= 1 ? 'No named scenario currently changes the model-rule leader.' : 'Treat the recommendation as conditional and inspect the switch regions below.'}</p></div>
    </div>

    <div className="scenario-matrix-shell">
      <div className="scenario-matrix-title"><div><GitCompareArrows size={14} /><span>SCENARIO MATRIX</span></div><small>Values are explicit inputs, not generated confidence.</small></div>
      <div className="scenario-matrix-scroll">
        <div className="scenario-matrix" style={{ gridTemplateColumns: `180px repeat(${decision.assumptions.length}, minmax(118px, 1fr)) 150px` }}>
          <div className="scenario-cell scenario-head">SCENARIO</div>
          {decision.assumptions.map((assumption) => <div className="scenario-cell scenario-head" key={assumption.id}>{assumption.name}<small>{assumption.unit || 'value'}</small></div>)}
          <div className="scenario-cell scenario-head">ACTION</div>
          {decision.scenarioSets.map((scenarioSet) => <div className="scenario-row" style={{ display: 'contents' }} key={scenarioSet.id}>
            <div className="scenario-cell scenario-name"><span>{setBadge(scenarioSet.kind)}</span><strong>{scenarioSet.name}</strong><small>{scenarioSet.rationale || 'No rationale recorded.'}</small></div>
            {decision.assumptions.map((assumption) => <div className="scenario-cell" key={`${scenarioSet.id}-${assumption.id}`}><input type="number" disabled={readOnly} min={assumption.min} max={assumption.max} step={(assumption.max - assumption.min) / 100 || 1} value={Number((scenarioSet.assumptionValues[assumption.id] ?? assumption.value).toFixed(2))} onChange={(event) => onUpdateScenario(scenarioSet.id, { assumptionValues: { ...scenarioSet.assumptionValues, [assumption.id]: Math.max(assumption.min, Math.min(assumption.max, Number(event.target.value))) } })} /><small>{assumption.min}–{assumption.max}</small></div>)}
            <div className="scenario-cell scenario-actions"><button type="button" disabled={readOnly} onClick={() => onApply(scenarioSet.assumptionValues)}><RotateCcw size={11} /> Apply</button>{scenarioSet.kind === 'custom' && !readOnly ? <button type="button" className="danger" onClick={() => onRemoveScenario(scenarioSet.id)}><Trash2 size={11} /> Remove</button> : null}</div>
          </div>)}
        </div>
      </div>
    </div>

    <div className="scenario-comparison-grid">
      {comparisons.map((comparison) => <article key={comparison.scenarioSet.id} className={comparison.run.recommendedAlternativeId !== baselineLeader ? 'leader-switch' : ''}>
        <div><span>{setBadge(comparison.scenarioSet.kind)}</span><strong>{comparison.scenarioSet.name}</strong></div>
        <h3>{comparison.leaderName}</h3>
        <p>Leader score {comparison.leaderScore.toFixed(1)} · margin {comparison.margin.toFixed(1)} · {comparison.guardrailPass ? 'guardrails pass' : 'leader breaches a guardrail'}</p>
        <dl><div><dt>Rationale</dt><dd>{comparison.scenarioSet.rationale || '—'}</dd></div><div><dt>Revisit condition</dt><dd>{comparison.scenarioSet.revisitConditions || '—'}</dd></div></dl>
        {comparison.run.recommendedAlternativeId !== baselineLeader ? <small>LEADER CHANGES FROM BASE</small> : null}
      </article>)}
    </div>

    {!readOnly ? <div className="custom-scenario-builder"><div><Plus size={14} /><span>SAVE CURRENT ASSUMPTIONS AS NAMED SCENARIO</span></div><input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Scenario name" /><input value={draftRationale} onChange={(event) => setDraftRationale(event.target.value)} placeholder="Decision rationale for this scenario" /><input value={draftRevisit} onChange={(event) => setDraftRevisit(event.target.value)} placeholder="Revisit condition" /><button type="button" onClick={saveCustom}><Save size={12} /> Save set</button></div> : null}

    <div className="decision-surface-section">
      <div className="decision-surface-head"><div><ScanLine size={15} /><span>KILLER INTERACTION / LIVE DECISION BOUNDARY</span><strong>{surface.xAssumption?.name ?? 'Assumption'} × {surface.yAssumption?.name ?? 'Assumption'}</strong></div><p>This 7×7 field executes the real deterministic model at 49 assumption combinations. Click any cell to move the live decision to that coordinate; every output and the optical prism recompute from the same state.</p></div>
      {surface.cells.length ? <>
        <div className="decision-surface-axis y-axis"><span>{surface.yAssumption?.name}</span><b>HIGH ↑</b><b>↓ LOW</b></div>
        <div className="decision-surface-field" style={{ gridTemplateColumns: `repeat(${surface.steps}, 1fr)` }}>
          {surface.cells.map((cell) => {
            const alternativeIndex = Math.max(0, decision.alternatives.findIndex((item) => item.id === cell.leaderId));
            const key = `${cell.xIndex}-${cell.yIndex}`;
            const active = Math.abs((surface.xAssumption?.value ?? 0) - cell.xValue) <= ((surface.xAssumption?.max ?? 0) - (surface.xAssumption?.min ?? 0)) / (surface.steps - 1) / 2
              && Math.abs((surface.yAssumption?.value ?? 0) - cell.yValue) <= ((surface.yAssumption?.max ?? 0) - (surface.yAssumption?.min ?? 0)) / (surface.steps - 1) / 2;
            return <button
              type="button"
              key={key}
              disabled={readOnly}
              className={`surface-cell leader-${alternativeIndex % 4} ${cell.leaderId !== surface.baselineLeaderId ? 'switch' : ''} ${cell.guardrailPass ? '' : 'breach'} ${active ? 'current' : ''}`}
              onPointerEnter={() => setHoveredCellKey(key)}
              onPointerLeave={() => setHoveredCellKey(null)}
              onClick={() => surface.xAssumption && surface.yAssumption && onApply({ [surface.xAssumption.id]: cell.xValue, [surface.yAssumption.id]: cell.yValue })}
              aria-label={`${cell.leaderName}. ${surface.xAssumption?.name} ${cell.xValue}, ${surface.yAssumption?.name} ${cell.yValue}. ${cell.guardrailPass ? 'guardrails pass' : 'guardrail breach'}`}
            >
              {active ? <Crosshair size={12} /> : null}
              {hoveredCellKey === key || active ? <span><strong>{cell.leaderName}</strong><small>{cell.xValue} × {cell.yValue}<br />margin {cell.margin.toFixed(1)} · {cell.guardrailPass ? 'PASS' : 'BREACH'}</small></span> : null}
            </button>;
          })}
        </div>
        <div className="decision-surface-axis x-axis"><b>LOW</b><span>{surface.xAssumption?.name}</span><b>HIGH →</b></div>
        <div className="decision-surface-legend">{decision.alternatives.map((alternative, index) => <span key={alternative.id}><i className={`leader-${index % 4}`} />{alternative.name}</span>)}<span><i className="switch-mark" />switch from base</span><span><i className="breach-mark" />guardrail breach</span></div>
      </> : <p className="scenario-empty">Add at least two assumptions to calculate the decision boundary field.</p>}
    </div>

    <div className="stability-map-section">
      <div className="stability-map-head"><div><span>STABILITY MAP</span><strong>{stability.xAssumption?.name ?? 'Assumption'} × {stability.yAssumption?.name ?? 'Assumption'}</strong></div><p>Each cell runs both assumptions at low/base/high while holding the rest at the current version. A changed leader marks a real model switch region.</p></div>
      {stability.cells.length ? <div className="stability-map-grid">{stability.cells.map((cell) => <button type="button" disabled={readOnly} key={`${cell.xState}-${cell.yState}`} className={cell.leaderId !== stability.baselineLeaderId ? 'switch' : ''} onClick={() => stability.xAssumption && stability.yAssumption && onApply({ [stability.xAssumption.id]: cell.xValue, [stability.yAssumption.id]: cell.yValue })}><span>{cell.xState.toUpperCase()} × {cell.yState.toUpperCase()}</span><strong>{cell.leaderName}</strong><small>{stability.xAssumption?.name}: {cell.xValue.toFixed(1)} · {stability.yAssumption?.name}: {cell.yValue.toFixed(1)}</small><b>{cell.leaderId !== stability.baselineLeaderId ? 'LEADER SWITCH' : 'BASE LEADER'} · {cell.guardrailPass ? 'PASS' : 'BREACH'}</b></button>)}</div> : <p className="scenario-empty">Add at least two assumptions to calculate a stability map.</p>}
    </div>

    <div className="investigation-queue">
      <div className="investigation-head"><div><span>VALIDATION → INVESTIGATION WORKFLOW</span><strong>Evidence requests</strong></div><b>{openInvestigations.length} open</b></div>
      {openInvestigations.length ? openInvestigations.map((item) => {
        const assumption = decision.assumptions.find((entry) => entry.id === item.assumptionId);
        return <article key={item.id}><div><span>{assumption?.name ?? item.assumptionId}</span><strong>{item.title}</strong><p>{item.evidenceRequest}</p></div>{!readOnly ? <button type="button" onClick={() => onResolveInvestigation(item.id)}><Check size={11} /> Mark resolved</button> : null}</article>;
      }) : <p>No open investigation items. Create one directly from Validation Priority when an assumption needs evidence.</p>}
    </div>
  </section>;
}
