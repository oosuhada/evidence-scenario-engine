import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EvidenceItem, ScenarioRun, ScenarioSet, StrategyDecision } from '../decision-model/types';
import { cloneAsNewVersion, createEntityId } from '../decision-model/factories';
import { decisionRepository } from '../api/provider';
import { calculateSensitivity, runScenario } from '../scenario-engine/engine';
import { decisionPath, navigate } from '../routes/route-state';

export type PersistenceState = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export function useDecisionWorkspace(initialDecision: StrategyDecision, readOnly = false) {
  const [decision, setDecision] = useState(initialDecision);
  const [run, setRun] = useState<ScenarioRun>(() => runScenario(initialDecision));
  const [persistence, setPersistence] = useState<PersistenceState>('idle');
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    setDecision(initialDecision);
    setRun(runScenario(initialDecision));
  }, [initialDecision]);

  const persist = useCallback(async (next: StrategyDecision) => {
    if (readOnly) return;
    setPersistence('saving');
    try {
      await decisionRepository.save(next);
      setPersistence(navigator.onLine ? 'saved' : 'offline');
    } catch {
      setPersistence('error');
    }
  }, [readOnly]);

  const updateDecision = useCallback((updater: (current: StrategyDecision) => StrategyDecision) => {
    if (readOnly) return;
    setDecision((current) => {
      const next = { ...updater(current), updatedAt: new Date().toISOString() };
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => { void persist(next); }, 180);
      return next;
    });
  }, [persist, readOnly]);

  useEffect(() => () => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
  }, []);

  const activeVersion = useMemo(
    () => decision.versions.find((version) => version.id === decision.activeVersionId) ?? decision.versions[decision.versions.length - 1],
    [decision],
  );

  const sensitivity = useMemo(() => calculateSensitivity(decision, run), [decision, run]);

  const rerun = useCallback(() => {
    const nextRun = runScenario(decision);
    setRun(nextRun);
    return nextRun;
  }, [decision]);

  const setActiveVersion = useCallback((versionId: string) => {
    const version = decision.versions.find((entry) => entry.id === versionId);
    if (!version) return;
    const next = {
      ...decision,
      activeVersionId: versionId,
      assumptions: decision.assumptions.map((assumption) => ({
        ...assumption,
        value: version.assumptionValues[assumption.id] ?? assumption.value,
      })),
    };
    setDecision(next);
    setRun(runScenario(next, versionId));
    if (!readOnly) {
      void persist(next).then(() => navigate(decisionPath(next.id, versionId)));
    }
  }, [decision, persist, readOnly]);

  const createVersion = useCallback(() => {
    if (readOnly) return;
    const next = cloneAsNewVersion(decision);
    setDecision(next);
    setRun(runScenario(next));
    void persist(next).then(() => navigate(decisionPath(next.id, next.activeVersionId)));
  }, [decision, persist, readOnly]);

  const setHorizon = useCallback((months: number) => {
    updateDecision((current) => ({
      ...current,
      versions: current.versions.map((version) => version.id === current.activeVersionId ? { ...version, horizonMonths: months } : version),
    }));
  }, [updateDecision]);

  const setAssumption = useCallback((assumptionId: string, value: number) => {
    updateDecision((current) => ({
      ...current,
      assumptions: current.assumptions.map((assumption) => assumption.id === assumptionId ? { ...assumption, value } : assumption),
      versions: current.versions.map((version) => version.id === current.activeVersionId
        ? { ...version, assumptionValues: { ...version.assumptionValues, [assumptionId]: value } }
        : version),
    }));
  }, [updateDecision]);

  const applyAssumptionSet = useCallback((assumptionValues: Record<string, number>) => {
    if (readOnly) return;
    const next: StrategyDecision = {
      ...decision,
      updatedAt: new Date().toISOString(),
      assumptions: decision.assumptions.map((assumption) => ({
        ...assumption,
        value: assumptionValues[assumption.id] ?? assumption.value,
      })),
      versions: decision.versions.map((version) => version.id === decision.activeVersionId
        ? { ...version, assumptionValues: { ...version.assumptionValues, ...assumptionValues } }
        : version),
    };
    setDecision(next);
    setRun(runScenario(next));
    void persist(next);
  }, [decision, persist, readOnly]);

  const saveScenarioSet = useCallback((name: string, rationale: string, revisitConditions: string) => {
    const scenarioSet: ScenarioSet = {
      id: createEntityId('scenario'),
      name,
      kind: 'custom',
      assumptionValues: Object.fromEntries(decision.assumptions.map((assumption) => [assumption.id, assumption.value])),
      rationale,
      revisitConditions,
      createdAt: new Date().toISOString(),
    };
    updateDecision((current) => ({ ...current, scenarioSets: [...current.scenarioSets, scenarioSet] }));
  }, [decision.assumptions, updateDecision]);

  const updateScenarioSet = useCallback((scenarioSetId: string, patch: Partial<Pick<ScenarioSet, 'name' | 'rationale' | 'revisitConditions' | 'assumptionValues'>>) => {
    updateDecision((current) => ({
      ...current,
      scenarioSets: current.scenarioSets.map((scenarioSet) => scenarioSet.id === scenarioSetId ? { ...scenarioSet, ...patch } : scenarioSet),
    }));
  }, [updateDecision]);

  const removeScenarioSet = useCallback((scenarioSetId: string) => {
    updateDecision((current) => ({
      ...current,
      scenarioSets: current.scenarioSets.filter((scenarioSet) => scenarioSet.id !== scenarioSetId || scenarioSet.kind !== 'custom'),
    }));
  }, [updateDecision]);

  const addInvestigation = useCallback((assumptionId: string, evidenceRequest?: string) => {
    const assumption = decision.assumptions.find((entry) => entry.id === assumptionId);
    if (!assumption) return;
    updateDecision((current) => {
      if (current.investigationItems.some((item) => item.assumptionId === assumptionId && item.status === 'open')) return current;
      return {
        ...current,
        investigationItems: [...current.investigationItems, {
          id: createEntityId('investigation'),
          assumptionId,
          title: `Validate ${assumption.name}`,
          evidenceRequest: evidenceRequest?.trim() || `Collect direct evidence that can move “${assumption.name}” inside its configured ${assumption.min}${assumption.unit}–${assumption.max}${assumption.unit} range, including an adverse observation that would falsify the current value.`,
          status: 'open',
          createdAt: new Date().toISOString(),
        }],
      };
    });
  }, [decision.assumptions, updateDecision]);

  const resolveInvestigation = useCallback((investigationId: string) => {
    updateDecision((current) => ({
      ...current,
      investigationItems: current.investigationItems.map((item) => item.id === investigationId ? { ...item, status: 'resolved', resolvedAt: new Date().toISOString() } : item),
    }));
  }, [updateDecision]);

  const addEvidence = useCallback((input: Omit<EvidenceItem, 'id' | 'addedAt'>) => {
    updateDecision((current) => ({
      ...current,
      evidence: [...current.evidence, { ...input, id: createEntityId('evidence'), addedAt: new Date().toISOString() }],
    }));
  }, [updateDecision]);

  const recordDecision = useCallback((selectedAlternativeId: string, rationale: string, conditions: string) => {
    updateDecision((current) => ({
      ...current,
      status: 'recorded',
      decisionRecords: [...current.decisionRecords, {
        id: createEntityId('record'),
        recordedAt: new Date().toISOString(),
        selectedAlternativeId,
        rationale,
        conditions,
        versionId: current.activeVersionId,
      }],
    }));
  }, [updateDecision]);

  return {
    decision,
    run,
    activeVersion,
    sensitivity,
    persistence,
    readOnly,
    setDecision: updateDecision,
    rerun,
    setActiveVersion,
    createVersion,
    setHorizon,
    setAssumption,
    applyAssumptionSet,
    saveScenarioSet,
    updateScenarioSet,
    removeScenarioSet,
    addInvestigation,
    resolveInvestigation,
    addEvidence,
    recordDecision,
  };
}
