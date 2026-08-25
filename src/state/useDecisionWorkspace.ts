import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EvidenceItem, ScenarioRun, StrategyDecision } from '../decision-model/types';
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
    addEvidence,
    recordDecision,
  };
}
