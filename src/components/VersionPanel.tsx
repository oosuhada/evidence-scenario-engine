import { GitCompareArrows, Plus } from 'lucide-react';
import type { StrategyDecision } from '../decision-model/types';
import { compareVersions } from '../scenario-engine/engine';

export function VersionPanel({ decision, onSelect, onCreate, readOnly }: {
  decision: StrategyDecision;
  onSelect: (versionId: string) => void;
  onCreate: () => void;
  readOnly: boolean;
}) {
  const activeIndex = decision.versions.findIndex((entry) => entry.id === decision.activeVersionId);
  const previous = activeIndex > 0 ? decision.versions[activeIndex - 1] : undefined;
  const differences = previous ? compareVersions(decision, previous.id, decision.activeVersionId) : [];
  return (
    <section className="version-panel">
      <div className="version-head"><span><GitCompareArrows size={13} /> SCENARIO VERSIONS</span>{!readOnly ? <button type="button" onClick={onCreate}><Plus size={13} /> Freeze new version</button> : null}</div>
      <div className="version-tabs">
        {decision.versions.map((version) => <button type="button" key={version.id} className={version.id === decision.activeVersionId ? 'active' : ''} onClick={() => onSelect(version.id)}><span>V{version.number}</span><strong>{version.label}</strong><small>{version.horizonMonths}m · seed {version.seed}</small></button>)}
      </div>
      {previous ? <div className="version-diff"><span>Δ from V{previous.number}</span>{differences.length === 0 ? <small>No assumption value changes.</small> : differences.slice(0, 4).map((item) => <small key={item.assumptionId}>{item.assumptionName} <b>{item.delta > 0 ? '+' : ''}{item.delta}</b></small>)}</div> : null}
    </section>
  );
}
