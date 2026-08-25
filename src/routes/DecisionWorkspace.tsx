import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Download,
  FileDown,
  FlaskConical,
  ImageDown,
  Play,
  Printer,
  Radio,
  RefreshCw,
  Save,
  Share2,
  ShieldAlert,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { SkepticResult, StrategyDecision } from '../decision-model/types';
import { useDecisionWorkspace } from '../state/useDecisionWorkspace';
import { supportsWebGL } from '../lib/shared';
import { PrismFallback } from '../scene/PrismFallback';
import { PrismLegend } from '../components/PrismLegend';
import { DecisionSetupPanel } from '../components/editor/DecisionSetupPanel';
import { OutcomeComparison } from '../components/analytical/OutcomeComparison';
import { SensitivityTornado } from '../components/analytical/SensitivityTornado';
import { DependencyMap } from '../components/analytical/DependencyMap';
import { CalculationBreakdown } from '../components/analytical/CalculationBreakdown';
import { EvidenceLedger } from '../components/evidence/EvidenceLedger';
import { VersionPanel } from '../components/VersionPanel';
import { runSkeptic } from '../skeptic/adapter';
import { decisionRepository } from '../api/provider';
import { downloadAssumptionsCsv, downloadDecisionMemo, downloadScenarioSnapshot, printDecisionMemo } from '../api/export';
import { persistScenarioRunBestEffort, recordExportBestEffort } from '../api/telemetry';
import { createEntityId } from '../decision-model/factories';
import { navigate, sharePath } from './route-state';

const LazyDecisionScene = lazy(() => import('../scene/DecisionScene'));

type ViewMode = 'prism' | 'analysis';

function MetricReadout({ label, value, range, emphasis }: { label: string; value: string; range?: string; emphasis?: boolean }) {
  return <div className={`stage-metric ${emphasis ? 'emphasis' : ''}`}><span>{label}</span><strong>{value}</strong>{range ? <small>{range}</small> : null}</div>;
}

export function DecisionWorkspace({ initialDecision, readOnly = false, shared = false }: {
  initialDecision: StrategyDecision;
  readOnly?: boolean;
  shared?: boolean;
}) {
  const workspace = useDecisionWorkspace(initialDecision, readOnly);
  const reducedMotion = Boolean(useReducedMotion());
  const webgl = useMemo(() => supportsWebGL(), []);
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden');
  const [viewMode, setViewMode] = useState<ViewMode>(() => window.matchMedia('(max-width: 720px)').matches ? 'analysis' : 'prism');
  const [selectedAlternativeId, setSelectedAlternativeId] = useState(workspace.run.recommendedAlternativeId || workspace.decision.alternatives[0]?.id || '');
  const [skepticOpen, setSkepticOpen] = useState(false);
  const [skepticLoading, setSkepticLoading] = useState(false);
  const [skepticResult, setSkepticResult] = useState<SkepticResult | null>(null);
  const [skepticError, setSkepticError] = useState('');
  const skepticAbortRef = useRef<AbortController | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordRationale, setRecordRationale] = useState('');
  const [recordConditions, setRecordConditions] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [contextLost, setContextLost] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const handler = () => setDocumentVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  useEffect(() => {
    if (!workspace.run.outcomes.some((outcome) => outcome.alternativeId === selectedAlternativeId)) {
      setSelectedAlternativeId(workspace.run.recommendedAlternativeId || workspace.run.outcomes[0]?.alternativeId || '');
    }
  }, [selectedAlternativeId, workspace.run]);

  const selectedIndex = Math.max(0, workspace.decision.alternatives.findIndex((entry) => entry.id === selectedAlternativeId));
  const selectedAlternative = workspace.decision.alternatives[selectedIndex];
  const selectedOutcome = workspace.run.outcomes.find((outcome) => outcome.alternativeId === selectedAlternativeId) ?? workspace.run.outcomes[0];
  const scoreRange = workspace.run.outcomes.map((outcome) => outcome.score);
  const divergence = scoreRange.length > 0 ? Math.max(...scoreRange) - Math.min(...scoreRange) : 0;
  const lowPower = useMemo(() => {
    const device = navigator as Navigator & { deviceMemory?: number };
    return navigator.webdriver
      || (device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 4)
      || Boolean(device.deviceMemory && device.deviceMemory <= 4);
  }, []);

  if (!selectedOutcome || !selectedAlternative) {
    return <main className="empty-state"><h1>Decision needs alternatives.</h1><p>Add at least one alternative before running a scenario.</p></main>;
  }

  const changeAlternative = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(workspace.decision.alternatives.length - 1, selectedIndex + direction));
    setSelectedAlternativeId(workspace.decision.alternatives[next]?.id ?? selectedAlternativeId);
  };

  const executeRun = () => {
    setActionError('');
    try {
      const next = workspace.rerun();
      setSelectedAlternativeId(next.recommendedAlternativeId || selectedAlternativeId);
      void persistScenarioRunBestEffort(next);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Scenario run failed.');
    }
  };

  const askSkeptic = async () => {
    skepticAbortRef.current?.abort();
    const controller = new AbortController();
    skepticAbortRef.current = controller;
    setSkepticOpen(true);
    setSkepticLoading(true);
    setSkepticError('');
    try {
      const result = await runSkeptic({ decision: workspace.decision, run: workspace.run, selectedAlternativeId }, controller.signal);
      setSkepticResult(result);
    } catch {
      if (!controller.signal.aborted) setSkepticError('The skeptic request failed. Retry or use the deterministic fallback after the provider recovers.');
    } finally {
      if (!controller.signal.aborted) setSkepticLoading(false);
    }
  };

  const createShare = async () => {
    const token = createEntityId('share').replace('share-', '').slice(0, 22);
    const link = { token, createdAt: new Date().toISOString(), versionId: workspace.decision.activeVersionId };
    const next = { ...workspace.decision, shareLinks: [...workspace.decision.shareLinks, link] };
    workspace.setDecision(() => next);
    await decisionRepository.createShare(next, token);
    const path = sharePath(token);
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage('Read-only link copied');
    } catch {
      setShareMessage(url);
    }
  };

  const revokeShare = async (token: string) => {
    await decisionRepository.revokeShare(token);
    workspace.setDecision((current) => ({
      ...current,
      shareLinks: current.shareLinks.map((link) => link.token === token ? { ...link, revokedAt: new Date().toISOString() } : link),
    }));
    setShareMessage('Share link revoked');
  };

  return (
    <main className={`simulator-shell ${readOnly ? 'read-only' : ''}`}>
      <header className="simulator-header">
        <button className="brand-button" type="button" onClick={() => navigate('/')}><ArrowLeft size={15} /><FlaskConical size={16} /><span>EVIDENCE SCENARIO ENGINE</span></button>
        <div className="decision-header-title"><span>{shared ? 'READ-ONLY SHARE' : 'STRATEGY DECISION SIMULATOR'}</span><strong>{workspace.decision.title}</strong></div>
        <div className="system-health"><Radio size={11} /><span>MODEL {workspace.run.modelVersion}</span><b className={workspace.persistence}>{readOnly ? 'READ ONLY' : workspace.persistence === 'saving' ? 'SAVING' : workspace.persistence === 'error' ? 'SAVE ERROR' : workspace.persistence === 'offline' ? 'OFFLINE LOCAL' : 'PERSISTED'}</b></div>
        <div className="header-actions">
          <div className="view-toggle" role="group" aria-label="Workspace view">
            <button type="button" className={viewMode === 'prism' ? 'active' : ''} onClick={() => setViewMode('prism')}><Sparkles size={13} /> Prism</button>
            <button type="button" className={viewMode === 'analysis' ? 'active' : ''} onClick={() => setViewMode('analysis')}><BarChart3 size={13} /> Analysis</button>
          </div>
          <button type="button" className="skeptic-button" onClick={() => void askSkeptic()}><ShieldAlert size={14} /> Challenge</button>
          {!readOnly ? <button type="button" className="run-button" onClick={executeRun}><Play size={13} fill="currentColor" /> Run scenario</button> : null}
        </div>
      </header>

      {actionError ? <div className="action-error"><AlertTriangle size={14} /> {actionError}<button onClick={() => setActionError('')}><X size={13} /></button></div> : null}
      {shareMessage ? <div className="toast-message"><Check size={13} /> {shareMessage}</div> : null}

      <div className="simulator-grid">
        <aside className="model-rail">
          <DecisionSetupPanel decision={workspace.decision} onChange={workspace.setDecision} readOnly={readOnly} />
        </aside>

        <section className="main-workbench">
          <div className={`decision-stage ${viewMode === 'analysis' ? 'analysis-mode' : ''}`}>
            <div className="stage-question"><span>DECISION / {workspace.activeVersion?.label.toUpperCase()}</span><h1>{workspace.decision.question}</h1></div>

            <div className="alternative-rail" role="tablist" aria-label="Alternative selection">
              {workspace.decision.alternatives.map((alternative, index) => (
                <button key={alternative.id} type="button" role="tab" aria-selected={alternative.id === selectedAlternativeId} className={alternative.id === selectedAlternativeId ? 'active' : ''} onClick={() => setSelectedAlternativeId(alternative.id)}>
                  <span>{String(index + 1).padStart(2, '0')}</span><strong>{alternative.name}</strong>
                </button>
              ))}
            </div>

            {viewMode === 'prism' ? (
              <>
                {webgl && !contextLost ? (
                  <Suspense fallback={<div className="scene-loading">CALIBRATING OPTICAL MODEL ···</div>}>
                    <LazyDecisionScene
                      decision={workspace.decision}
                      outcome={selectedOutcome}
                      activeAlternativeIndex={selectedIndex}
                      divergence={divergence}
                      reducedMotion={reducedMotion}
                      lowPower={lowPower}
                      documentVisible={documentVisible}
                      onContextLost={() => setContextLost(true)}
                      onContextRestored={() => setContextLost(false)}
                    />
                  </Suspense>
                ) : <PrismFallback outcome={selectedOutcome} label={contextLost ? 'WebGL context lost; 2D fallback active' : 'WebGL unavailable; 2D fallback active'} />}
                {contextLost ? <button className="context-recover" type="button" onClick={() => window.location.reload()}><RefreshCw size={13} /> Restore WebGL context</button> : null}
                <PrismLegend />
              </>
            ) : (
              <div className="stage-2d-summary">
                <PrismFallback outcome={selectedOutcome} label="2D analytical prism" />
                <div className="stage-2d-copy"><span>2D EQUIVALENT STATE</span><strong>{selectedAlternative.name}</strong><p>{workspace.run.decisionRule}</p></div>
              </div>
            )}

            <div className="stage-metrics stage-left-top"><MetricReadout label="MODEL SCORE" value={selectedOutcome.score.toFixed(1)} emphasis /></div>
            <div className="stage-metrics stage-left-bottom"><MetricReadout label="EVIDENCE CLARITY" value={`${selectedOutcome.evidenceStrength.toFixed(0)}%`} /></div>
            <div className="stage-metrics stage-right-top"><MetricReadout label="UNCERTAINTY" value={`${selectedOutcome.uncertainty.toFixed(1)}%`} /></div>
            <div className="stage-metrics stage-right-bottom"><MetricReadout label="GUARDRAIL" value={selectedOutcome.guardrailPass ? 'PASS' : 'BREACH'} /></div>

            <div className="stage-nameplate">
              <button type="button" onClick={() => changeAlternative(-1)} disabled={selectedIndex === 0} aria-label="Previous alternative"><ChevronLeft size={18} /></button>
              <div><span>{workspace.run.recommendedAlternativeId === selectedAlternativeId ? 'MODEL-RULE LEADER' : 'ALTERNATIVE'}</span><strong>{selectedAlternative.name}</strong><small>{selectedAlternative.description}</small></div>
              <button type="button" onClick={() => changeAlternative(1)} disabled={selectedIndex === workspace.decision.alternatives.length - 1} aria-label="Next alternative"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="run-console">
            <div className="horizon-control"><span><CircleGauge size={13} /> HORIZON</span>{[6, 12, 36].map((months) => <button key={months} type="button" disabled={readOnly} className={workspace.activeVersion?.horizonMonths === months ? 'active' : ''} onClick={() => workspace.setHorizon(months)}>{months < 12 ? `${months}M` : `${months / 12}Y`}</button>)}</div>
            <div className="run-metadata"><span>SEED <b>{workspace.activeVersion?.seed}</b></span><span>ITERATIONS <b>{workspace.activeVersion?.iterations}</b></span><span>OUTPUT <b>{selectedOutcome.guardrailPass ? 'ELIGIBLE' : 'GUARDRAIL BREACH'}</b></span></div>
            <button type="button" className="run-console-button" onClick={executeRun} disabled={readOnly}><Play size={13} /> Recompute current version</button>
          </div>

          <VersionPanel decision={workspace.decision} onSelect={workspace.setActiveVersion} onCreate={workspace.createVersion} readOnly={readOnly} />

          <div className="analysis-stack">
            <OutcomeComparison decision={workspace.decision} run={workspace.run} selectedAlternativeId={selectedAlternativeId} onSelect={setSelectedAlternativeId} />
            <div className="analysis-columns"><SensitivityTornado rows={workspace.sensitivity} /><CalculationBreakdown decision={workspace.decision} outcome={selectedOutcome} /></div>
            <DependencyMap decision={workspace.decision} />
            <EvidenceLedger decision={workspace.decision} onAdd={workspace.addEvidence} readOnly={readOnly} />
          </div>
        </section>

        <aside className="inspection-rail">
          <div className="inspection-section">
            <span className="rail-label">SELECTED OUTCOME</span>
            <h2>{selectedAlternative.name}</h2>
            <p>{selectedAlternative.description}</p>
            <div className="outcome-bars">
              {selectedOutcome.metricOutcomes.map((metricOutcome) => {
                const metric = workspace.decision.metrics.find((entry) => entry.id === metricOutcome.metricId);
                return <div key={metricOutcome.metricId}><span>{metric?.name}<b>{metricOutcome.expected.toFixed(1)} {metric?.unit}</b></span><i><b style={{ width: `${Math.min(100, metricOutcome.expected)}%` }} /></i><small>{metricOutcome.low.toFixed(1)}–{metricOutcome.high.toFixed(1)} modeled range</small></div>;
              })}
            </div>
          </div>

          <div className="inspection-section">
            <span className="rail-label">ACTIVE ASSUMPTIONS</span>
            <div className="assumption-sliders">
              {workspace.decision.assumptions.map((assumption) => (
                <label key={assumption.id}><span>{assumption.name}<b>{assumption.value}{assumption.unit}</b></span><input type="range" min={assumption.min} max={assumption.max} step={(assumption.max - assumption.min) / 100 || 1} disabled={readOnly} value={assumption.value} onChange={(event) => workspace.setAssumption(assumption.id, Number(event.target.value))} /><small>{assumption.unresolved ? 'UNRESOLVED' : `${Math.round(assumption.confidence * 100)}% CONFIDENCE`}</small></label>
              ))}
            </div>
          </div>

          <div className="inspection-section model-warning"><BookOpenCheck size={15} /><div><strong>Not a forecast</strong><p>Ranges are generated from configured assumptions and uncertainty weights. They are not empirical probabilities.</p></div></div>

          <div className="rail-actions">
            {!readOnly ? <button type="button" onClick={() => setRecordOpen(true)}><Save size={14} /> Record decision</button> : null}
            {!readOnly ? <button type="button" onClick={() => void createShare()}><Share2 size={14} /> Create read-only share</button> : null}
            {!readOnly && workspace.decision.shareLinks.some((link) => !link.revokedAt) ? (
              <div className="active-shares">
                <span>ACTIVE SHARES</span>
                {workspace.decision.shareLinks.filter((link) => !link.revokedAt).map((link) => (
                  <button key={link.token} type="button" onClick={() => void revokeShare(link.token)}>
                    <span>{link.token.slice(0, 9)}…</span><b>REVOKE</b>
                  </button>
                ))}
              </div>
            ) : null}
            <button type="button" onClick={() => setExportOpen((current) => !current)}><Download size={14} /> Export <ChevronRight size={13} /></button>
            {exportOpen ? <div className="export-menu"><button onClick={() => { void recordExportBestEffort(workspace.decision, 'markdown'); downloadDecisionMemo(workspace.decision, workspace.run); }}><FileDown size={13} /> Memo · Markdown</button><button onClick={() => { void recordExportBestEffort(workspace.decision, 'pdf'); printDecisionMemo(); }}><Printer size={13} /> Memo · Print/PDF</button><button onClick={() => { void recordExportBestEffort(workspace.decision, 'csv'); downloadAssumptionsCsv(workspace.decision); }}><FileDown size={13} /> Assumptions · CSV</button><button onClick={() => { try { void recordExportBestEffort(workspace.decision, 'snapshot'); downloadScenarioSnapshot(); } catch (error) { setActionError(error instanceof Error ? error.message : 'Snapshot failed.'); } }}><ImageDown size={13} /> Prism snapshot · PNG</button></div> : null}
          </div>
        </aside>
      </div>

      {skepticOpen ? (
        <div className="skeptic-sheet" role="dialog" aria-modal="true" aria-labelledby="skeptic-heading">
          <div className="skeptic-sheet-head"><div><span>BOUNDED ADVERSARIAL REVIEW</span><h2 id="skeptic-heading">Challenge the model</h2></div><button type="button" onClick={() => { skepticAbortRef.current?.abort(); setSkepticLoading(false); setSkepticOpen(false); }} aria-label="Close skeptic"><X size={17} /></button></div>
          <div className="skeptic-context"><span>{selectedAlternative.name}</span><span>{workspace.activeVersion?.label}</span><span>{workspace.run.modelVersion}</span></div>
          {skepticLoading ? <div className="skeptic-loading"><RefreshCw size={16} /> Testing assumption weakness and contradictory evidence… <button type="button" onClick={() => { skepticAbortRef.current?.abort(); setSkepticLoading(false); }}><Square size={11} /> Cancel</button></div> : null}
          {skepticError ? <div className="skeptic-error"><AlertTriangle size={14} />{skepticError}<button type="button" onClick={() => void askSkeptic()}>Retry</button></div> : null}
          {skepticResult && !skepticLoading ? <div className="skeptic-grid"><article><span>01 / VULNERABLE ASSUMPTION</span><p>{skepticResult.vulnerableAssumption}</p></article><article><span>02 / MISSING EVIDENCE</span><p>{skepticResult.missingEvidence}</p></article><article><span>03 / COUNTER-SCENARIO</span><p>{skepticResult.counterScenario}</p></article><article><span>04 / FALSIFICATION TEST</span><p>{skepticResult.falsificationTest}</p></article><article><span>05 / MITIGATION</span><p>{skepticResult.mitigation}</p></article></div> : null}
          <div className="skeptic-foot"><AlertTriangle size={12} /> The skeptic cannot modify numeric outputs. Source: {skepticResult?.source ?? 'pending'}.</div>
        </div>
      ) : null}

      {recordOpen ? (
        <div className="modal-backdrop">
          <div className="modal-panel decision-record-modal" role="dialog" aria-modal="true" aria-labelledby="record-title">
            <div className="modal-head"><div><span>DECISION RECORD</span><h2 id="record-title">Record the commitment</h2></div><button type="button" onClick={() => setRecordOpen(false)} aria-label="Close"><X size={16} /></button></div>
            <div className="record-option"><span>Selected alternative</span><strong>{selectedAlternative.name}</strong><small>Version {workspace.activeVersion?.number} · model {workspace.run.modelVersion}</small></div>
            <label><span>Rationale</span><textarea autoFocus rows={4} value={recordRationale} onChange={(event) => setRecordRationale(event.target.value)} placeholder="Why is this the right decision under the current evidence?" /></label>
            <label><span>Conditions / revisit trigger</span><textarea rows={3} value={recordConditions} onChange={(event) => setRecordConditions(event.target.value)} placeholder="What new evidence would cause us to revisit it?" /></label>
            <div className="modal-actions"><button className="secondary-action" type="button" onClick={() => setRecordOpen(false)}>Cancel</button><button className="primary-action" type="button" disabled={!recordRationale.trim()} onClick={() => { workspace.recordDecision(selectedAlternativeId, recordRationale.trim(), recordConditions.trim()); setRecordOpen(false); setRecordRationale(''); setRecordConditions(''); }}>Record decision</button></div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
