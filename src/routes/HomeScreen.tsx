import { useRef, useState } from 'react';
import { ArrowRight, FileJson2, FlaskConical, Plus, Upload } from 'lucide-react';
import type { DecisionTemplateId, StrategyDecision } from '../decision-model/types';
import { createBlankDecision, createSampleDecision, createTemplateDecision } from '../decision-model/factories';
import { importDecisionSchema } from '../schemas/decision';
import { decisionRepository } from '../api/provider';
import { decisionPath, navigate } from './route-state';

const templates: Array<{ id: Exclude<DecisionTemplateId, 'blank'>; name: string; code: string; description: string }> = [
  { id: 'ai-adoption', code: 'T01', name: 'AI adoption', description: 'Adoption, data readiness, integration, evidence and staged deployment.' },
  { id: 'vendor-selection', code: 'T02', name: 'Vendor selection', description: 'Risk-adjusted strategic fit across incumbent, specialist and composable options.' },
  { id: 'factory-automation', code: 'T03', name: 'Factory automation', description: 'Scope automation by operational impact, readiness and downside exposure.' },
  { id: 'product-launch', code: 'T04', name: 'Product launch', description: 'Balance learning velocity, reach, execution capacity and market downside.' },
];

async function saveAndOpen(decision: StrategyDecision) {
  await decisionRepository.save(decision);
  navigate(decisionPath(decision.id, decision.activeVersionId));
}

function decisionFromCsv(csv: string) {
  const decision = createBlankDecision();
  const rows = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rows.length < 2) throw new Error('CSV needs a header row and at least one assumption row.');
  const headers = rows[0].split(',').map((value) => value.trim().toLowerCase());
  const nameIndex = headers.indexOf('name');
  const valueIndex = headers.indexOf('value');
  const minIndex = headers.indexOf('min');
  const maxIndex = headers.indexOf('max');
  const unitIndex = headers.indexOf('unit');
  if (nameIndex < 0 || valueIndex < 0) throw new Error('CSV headers must include name,value. Optional: min,max,unit.');
  decision.assumptions = rows.slice(1).map((line, index) => {
    const cells = line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
    const value = Number(cells[valueIndex]);
    const min = minIndex >= 0 ? Number(cells[minIndex]) : 0;
    const max = maxIndex >= 0 ? Number(cells[maxIndex]) : 100;
    return {
      id: `imported-assumption-${index + 1}`,
      name: cells[nameIndex] || `Imported assumption ${index + 1}`,
      description: 'Imported from CSV. Review impacts before using the model.',
      value: Number.isFinite(value) ? value : 50,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 100,
      unit: unitIndex >= 0 ? cells[unitIndex] || '%' : '%',
      confidence: 0.5,
      unresolved: true,
      impacts: decision.metrics.map((metric) => ({ metricId: metric.id, effectAtMin: 0, effectAtMax: 0 })),
    };
  });
  const active = decision.versions[0];
  active.assumptionValues = Object.fromEntries(decision.assumptions.map((assumption) => [assumption.id, assumption.value]));
  decision.title = 'Imported strategic decision';
  return decision;
}

export function HomeScreen({ decisions, onRefresh }: { decisions: StrategyDecision[]; onRefresh: () => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const importFile = async (file: File) => {
    setError('');
    try {
      const raw = await file.text();
      let decision: StrategyDecision;
      if (file.name.toLowerCase().endsWith('.csv')) {
        decision = decisionFromCsv(raw);
      } else {
        const parsed = importDecisionSchema.parse(JSON.parse(raw));
        const base = createBlankDecision();
        const versions = parsed.versions?.length ? parsed.versions : base.versions;
        decision = {
          ...base,
          ...parsed,
          id: base.id,
          createdAt: base.createdAt,
          updatedAt: base.updatedAt,
          status: parsed.status ?? 'draft',
          versions,
          activeVersionId: parsed.activeVersionId && versions.some((version) => version.id === parsed.activeVersionId) ? parsed.activeVersionId : versions[0].id,
          shareLinks: [],
          decisionRecords: [],
          notes: parsed.notes ?? '',
        };
      }
      await saveAndOpen(decision);
      await onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import failed.');
    }
  };

  return (
    <main className="home-shell">
      <header className="home-header">
        <div className="brand-lockup"><FlaskConical size={18} /><span>SCENARIO PRISM</span><b>STRATEGY DECISION SIMULATOR</b></div>
        <div className="home-model-tag">MODEL / DETERMINISTIC 2.0</div>
      </header>

      <section className="home-hero">
        <span className="eyebrow">MODEL → CHALLENGE → RECORD</span>
        <h1>Turn strategic assumptions into a decision you can inspect.</h1>
        <p>Scenario Prism keeps calculation, evidence, uncertainty and critique separate. The 3D prism is an interface to model state—not a forecast and not decoration.</p>
        <div className="hero-actions">
          <button type="button" className="primary-action" onClick={() => void saveAndOpen(createBlankDecision())}><Plus size={15} /> Create blank decision</button>
          <button type="button" className="secondary-action" onClick={() => void saveAndOpen(createSampleDecision())}><FlaskConical size={15} /> Open sample decision</button>
          <button type="button" className="secondary-action" onClick={() => fileInput.current?.click()}><Upload size={15} /> Import CSV / JSON</button>
          <input ref={fileInput} className="visually-hidden" type="file" accept=".json,.csv,application/json,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} />
        </div>
        {error ? <div className="import-error"><FileJson2 size={14} /> {error}</div> : null}
      </section>

      <section className="template-index" aria-labelledby="template-heading">
        <div className="index-heading"><span>STARTING STRUCTURES</span><h2 id="template-heading">Templates</h2><p>Use a domain starting point, then replace every assumption with your own evidence.</p></div>
        <div className="template-list">
          {templates.map((template) => (
            <button type="button" key={template.id} onClick={() => void saveAndOpen(createTemplateDecision(template.id))}>
              <span>{template.code}</span><strong>{template.name}</strong><p>{template.description}</p><ArrowRight size={15} />
            </button>
          ))}
        </div>
      </section>

      <section className="recent-index" aria-labelledby="recent-heading">
        <div className="index-heading"><span>PERSISTED WORK</span><h2 id="recent-heading">Recent decisions</h2></div>
        {decisions.length === 0 ? <div className="empty-recent">No decisions stored yet. A blank or sample decision will be preserved after every edit.</div> : (
          <div className="recent-list">
            {decisions.map((decision, index) => (
              <button type="button" key={decision.id} onClick={() => navigate(decisionPath(decision.id, decision.activeVersionId))}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{decision.title}</strong><small>{decision.question}</small></div>
                <b>{decision.versions.length}V · {decision.status.toUpperCase()}</b>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
