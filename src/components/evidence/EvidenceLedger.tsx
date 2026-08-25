import { useMemo, useState } from 'react';
import { BookOpenCheck, Plus, X } from 'lucide-react';
import type { EvidenceItem, StrategyDecision } from '../../decision-model/types';
import { buildEvidenceLedger, evidenceCoverage } from '../../evidence/evidence';

export function EvidenceLedger({ decision, onAdd, readOnly }: {
  decision: StrategyDecision;
  onAdd: (input: Omit<EvidenceItem, 'id' | 'addedAt'>) => void;
  readOnly: boolean;
}) {
  const ledger = useMemo(() => buildEvidenceLedger(decision), [decision]);
  const coverage = useMemo(() => evidenceCoverage(decision), [decision]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [strength, setStrength] = useState(0.7);
  const [stance, setStance] = useState<EvidenceItem['stance']>('supports');
  const [assumptionIds, setAssumptionIds] = useState<string[]>([]);

  const submit = () => {
    if (!title.trim() || !source.trim()) return;
    onAdd({ title: title.trim(), source: source.trim(), note: note.trim(), strength, relevance: 0.85, stance, assumptionIds });
    setTitle('');
    setSource('');
    setNote('');
    setAssumptionIds([]);
    setAdding(false);
  };

  return (
    <section className="analysis-card evidence-ledger" aria-labelledby="evidence-heading">
      <div className="section-heading">
        <div><span>05 / EVIDENCE</span><h2 id="evidence-heading">Evidence ledger</h2></div>
        <div className="coverage-readout"><strong>{coverage.strength}%</strong><span>weighted clarity<br />{coverage.covered}/{coverage.total} assumptions covered</span></div>
      </div>
      <div className="ledger-list">
        {ledger.length === 0 ? <div className="empty-inline"><BookOpenCheck size={18} /> No evidence linked yet. Model uncertainty stays intentionally high.</div> : ledger.map(({ evidence, assumptions, weightedStrength }) => (
          <article key={evidence.id}>
            <div className="ledger-index">{String(ledger.findIndex((entry) => entry.evidence.id === evidence.id) + 1).padStart(2, '0')}</div>
            <div className="ledger-main">
              <div className="ledger-title"><strong>{evidence.title}</strong><span className={`stance-${evidence.stance}`}>{evidence.stance}</span></div>
              <p>{evidence.note}</p>
              <small>{evidence.source}</small>
            </div>
            <div className="ledger-links"><span>{assumptions.map((item) => item.name).join(' · ') || 'Unlinked'}</span><b>{weightedStrength}</b></div>
          </article>
        ))}
      </div>
      {!readOnly ? <button className="inline-add" type="button" onClick={() => setAdding(true)}><Plus size={13} /> Add evidence</button> : null}

      {adding ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="evidence-modal-title">
            <div className="modal-head"><div><span>EVIDENCE ITEM</span><h2 id="evidence-modal-title">Add model evidence</h2></div><button type="button" onClick={() => setAdding(false)} aria-label="Close"><X size={16} /></button></div>
            <label><span>Title</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Pilot line yield study" /></label>
            <label><span>Source</span><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Origin, sample, date" /></label>
            <label><span>Observation / limitation</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <div className="form-split">
              <label><span>Stance</span><select value={stance} onChange={(event) => setStance(event.target.value as EvidenceItem['stance'])}><option value="supports">Supports</option><option value="contradicts">Contradicts</option><option value="neutral">Neutral</option></select></label>
              <label><span>Strength {Math.round(strength * 100)}%</span><input type="range" min="0.1" max="1" step="0.05" value={strength} onChange={(event) => setStrength(Number(event.target.value))} /></label>
            </div>
            <fieldset><legend>Linked assumptions</legend>{decision.assumptions.map((assumption) => <label className="checkbox-label" key={assumption.id}><input type="checkbox" checked={assumptionIds.includes(assumption.id)} onChange={(event) => setAssumptionIds((current) => event.target.checked ? [...current, assumption.id] : current.filter((id) => id !== assumption.id))} /><span>{assumption.name}</span></label>)}</fieldset>
            <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setAdding(false)}>Cancel</button><button type="button" className="primary-action" disabled={!title.trim() || !source.trim()} onClick={submit}>Add to ledger</button></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
