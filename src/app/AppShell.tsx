import { useCallback, useEffect, useState } from 'react';
import type { StrategyDecision } from '../decision-model/types';
import { createTemplateDecision } from '../decision-model/factories';
import { decisionRepository } from '../api/provider';
import { parseRoute, type RouteState } from '../routes/route-state';
import { HomeScreen } from '../routes/HomeScreen';
import { DecisionWorkspace } from '../routes/DecisionWorkspace';

export function AppShell() {
  const [route, setRoute] = useState<RouteState>(() => parseRoute(window.location.pathname));
  const [decisions, setDecisions] = useState<StrategyDecision[]>([]);
  const [decision, setDecision] = useState<StrategyDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshDecisions = useCallback(async () => {
    let next = await decisionRepository.list();
    const exampleTemplates = [
      ['ai-adoption', 'Example · Manufacturing AI rollout'],
      ['vendor-selection', 'Example · Strategic vendor selection'],
      ['factory-automation', 'Example · Factory automation expansion'],
      ['product-launch', 'Example · Product launch strategy'],
    ] as const;
    const existingTitles = new Set(next.map((decision) => decision.title));
    const missing = exampleTemplates.filter(([, title]) => !existingTitles.has(title));
    if (missing.length && next.length < 8) {
      for (const [templateId, title] of missing) {
        const sample = createTemplateDecision(templateId);
        sample.title = title;
        sample.status = 'draft';
        sample.notes = 'Saved example decision. Change assumptions or click the decision boundary to see the model recompute; duplicate or replace inputs before real use.';
        await decisionRepository.save(sample);
      }
      next = await decisionRepository.list();
    }
    setDecisions(next);
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        if (route.kind === 'home') {
          await refreshDecisions();
          if (active) setDecision(null);
        } else if (route.kind === 'decision') {
          const found = await decisionRepository.get(route.decisionId);
          if (!found) throw new Error('Decision not found. It may have been removed from this browser or database.');
          if (route.versionId && found.versions.some((version) => version.id === route.versionId)) {
            const version = found.versions.find((entry) => entry.id === route.versionId)!;
            found.activeVersionId = version.id;
            found.assumptions = found.assumptions.map((assumption) => ({ ...assumption, value: version.assumptionValues[assumption.id] ?? assumption.value }));
          }
          if (active) setDecision(found);
        } else {
          const shared = await decisionRepository.getShared(route.token);
          if (!shared) throw new Error('This share link is unavailable or has been revoked.');
          if (active) setDecision(shared);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load decision workspace.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [refreshDecisions, route]);

  if (loading) return <main className="route-state-screen"><span>EVIDENCE SCENARIO ENGINE</span><h1>Loading decision state…</h1><div className="route-loader" /></main>;
  if (error) return <main className="route-state-screen error"><span>EVIDENCE SCENARIO ENGINE / LOAD ERROR</span><h1>{error}</h1><button type="button" onClick={() => { window.history.pushState({}, '', '/'); setRoute({ kind: 'home' }); }}>Return to decisions</button></main>;
  if (route.kind === 'home') return <HomeScreen decisions={decisions} onRefresh={refreshDecisions} />;
  if (!decision) return <main className="route-state-screen"><h1>Decision unavailable.</h1></main>;
  return <DecisionWorkspace key={`${decision.id}-${route.kind === 'share' ? 'shared' : 'editable'}`} initialDecision={decision} readOnly={route.kind === 'share'} shared={route.kind === 'share'} />;
}
