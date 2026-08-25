import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import type { StrategyDecision } from '../../decision-model/types';
import { createEntityId } from '../../decision-model/factories';

export function DecisionSetupPanel({ decision, onChange, readOnly }: {
  decision: StrategyDecision;
  onChange: (updater: (current: StrategyDecision) => StrategyDecision) => void;
  readOnly: boolean;
}) {
  const updateAlternative = (alternativeId: string, key: 'name' | 'description', value: string) => {
    onChange((current) => ({
      ...current,
      alternatives: current.alternatives.map((alternative) => alternative.id === alternativeId ? { ...alternative, [key]: value } : alternative),
    }));
  };

  const updateMetricBase = (alternativeId: string, metricId: string, value: number) => {
    onChange((current) => ({
      ...current,
      alternatives: current.alternatives.map((alternative) => alternative.id === alternativeId
        ? { ...alternative, baseMetrics: { ...alternative.baseMetrics, [metricId]: value } }
        : alternative),
    }));
  };

  const addAlternative = () => {
    onChange((current) => ({
      ...current,
      alternatives: [...current.alternatives, {
        id: createEntityId('alt'),
        name: `Alternative ${current.alternatives.length + 1}`,
        description: 'Describe the strategic option.',
        baseMetrics: Object.fromEntries(current.metrics.map((metric) => [metric.id, 50])),
      }],
    }));
  };

  const addAssumption = () => {
    onChange((current) => {
      const id = createEntityId('assumption');
      return {
        ...current,
        assumptions: [...current.assumptions, {
          id,
          name: `Assumption ${current.assumptions.length + 1}`,
          description: 'Describe what must be true for the model.',
          value: 50,
          min: 0,
          max: 100,
          unit: '%',
          confidence: 0.5,
          unresolved: true,
          impacts: current.metrics.map((metric) => ({ metricId: metric.id, effectAtMin: 0, effectAtMax: 0 })),
        }],
        versions: current.versions.map((version) => version.id === current.activeVersionId
          ? { ...version, assumptionValues: { ...version.assumptionValues, [id]: 50 } }
          : version),
      };
    });
  };

  return (
    <section className="setup-panel" aria-labelledby="setup-heading">
      <div className="section-heading compact">
        <div><span>MODEL INPUTS</span><h2 id="setup-heading">Decision structure</h2></div>
        <SlidersHorizontal size={17} />
      </div>

      <div className="editable-title-block">
        <label>
          <span>DECISION TITLE</span>
          <input
            value={decision.title}
            readOnly={readOnly}
            onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label>
          <span>DECISION QUESTION</span>
          <textarea
            value={decision.question}
            readOnly={readOnly}
            rows={2}
            onChange={(event) => onChange((current) => ({ ...current, question: event.target.value }))}
          />
        </label>
      </div>

      <div className="input-section">
        <div className="input-section-title"><span>Alternatives</span><b>{decision.alternatives.length}</b></div>
        {decision.alternatives.map((alternative, alternativeIndex) => (
          <details className="editor-detail" key={alternative.id} open={alternativeIndex === 0}>
            <summary><span>{String(alternativeIndex + 1).padStart(2, '0')}</span><strong>{alternative.name}</strong></summary>
            <div className="editor-detail-body">
              <label><span>Name</span><input value={alternative.name} readOnly={readOnly} onChange={(event) => updateAlternative(alternative.id, 'name', event.target.value)} /></label>
              <label><span>Description</span><textarea rows={2} value={alternative.description} readOnly={readOnly} onChange={(event) => updateAlternative(alternative.id, 'description', event.target.value)} /></label>
              <div className="metric-base-grid">
                {decision.metrics.map((metric) => (
                  <label key={metric.id}>
                    <span>{metric.name}</span>
                    <input
                      type="number"
                      min="0"
                      max="150"
                      readOnly={readOnly}
                      value={alternative.baseMetrics[metric.id] ?? 0}
                      onChange={(event) => updateMetricBase(alternative.id, metric.id, Number(event.target.value))}
                    />
                  </label>
                ))}
              </div>
              {!readOnly && decision.alternatives.length > 2 ? (
                <button className="text-danger" type="button" onClick={() => onChange((current) => ({ ...current, alternatives: current.alternatives.filter((entry) => entry.id !== alternative.id) }))}>
                  <Trash2 size={13} /> Remove alternative
                </button>
              ) : null}
            </div>
          </details>
        ))}
        {!readOnly ? <button type="button" className="inline-add" onClick={addAlternative}><Plus size={13} /> Add alternative</button> : null}
      </div>

      <div className="input-section assumptions-editor">
        <div className="input-section-title"><span>Assumptions</span><b>{decision.assumptions.length}</b></div>
        {decision.assumptions.map((assumption) => (
          <details className="editor-detail" key={assumption.id}>
            <summary><span className={assumption.unresolved ? 'unresolved-dot' : 'resolved-dot'} /><strong>{assumption.name}</strong><b>{assumption.value}{assumption.unit}</b></summary>
            <div className="editor-detail-body">
              <label><span>Name</span><input readOnly={readOnly} value={assumption.name} onChange={(event) => onChange((current) => ({ ...current, assumptions: current.assumptions.map((entry) => entry.id === assumption.id ? { ...entry, name: event.target.value } : entry) }))} /></label>
              <label><span>Description</span><textarea readOnly={readOnly} rows={2} value={assumption.description} onChange={(event) => onChange((current) => ({ ...current, assumptions: current.assumptions.map((entry) => entry.id === assumption.id ? { ...entry, description: event.target.value } : entry) }))} /></label>
              <div className="assumption-bounds">
                <label><span>Min</span><input type="number" readOnly={readOnly} value={assumption.min} onChange={(event) => onChange((current) => ({ ...current, assumptions: current.assumptions.map((entry) => entry.id === assumption.id ? { ...entry, min: Number(event.target.value) } : entry) }))} /></label>
                <label><span>Current</span><input type="number" readOnly={readOnly} value={assumption.value} onChange={(event) => onChange((current) => ({ ...current, assumptions: current.assumptions.map((entry) => entry.id === assumption.id ? { ...entry, value: Number(event.target.value) } : entry), versions: current.versions.map((version) => version.id === current.activeVersionId ? { ...version, assumptionValues: { ...version.assumptionValues, [assumption.id]: Number(event.target.value) } } : version) }))} /></label>
                <label><span>Max</span><input type="number" readOnly={readOnly} value={assumption.max} onChange={(event) => onChange((current) => ({ ...current, assumptions: current.assumptions.map((entry) => entry.id === assumption.id ? { ...entry, max: Number(event.target.value) } : entry) }))} /></label>
              </div>
              <label className="confidence-control"><span>Confidence <b>{Math.round(assumption.confidence * 100)}%</b></span><input type="range" min="0.1" max="1" step="0.01" disabled={readOnly} value={assumption.confidence} onChange={(event) => onChange((current) => ({ ...current, assumptions: current.assumptions.map((entry) => entry.id === assumption.id ? { ...entry, confidence: Number(event.target.value) } : entry) }))} /></label>
              <label className="checkbox-label"><input type="checkbox" disabled={readOnly} checked={assumption.unresolved} onChange={(event) => onChange((current) => ({ ...current, assumptions: current.assumptions.map((entry) => entry.id === assumption.id ? { ...entry, unresolved: event.target.checked } : entry) }))} /> <span>Unresolved / needs validation</span></label>
            </div>
          </details>
        ))}
        {!readOnly ? <button type="button" className="inline-add" onClick={addAssumption}><Plus size={13} /> Add assumption</button> : null}
      </div>
    </section>
  );
}
