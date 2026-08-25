import type { ScenarioRun, StrategyDecision } from '../decision-model/types';

async function apiAvailable() {
  try {
    const response = await fetch('/api/health', { signal: AbortSignal.timeout(700) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function persistScenarioRunBestEffort(run: ScenarioRun) {
  if (!await apiAvailable()) return;
  try {
    await fetch('/api/scenario-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // The deterministic result remains valid if audit persistence is temporarily unavailable.
  }
}

export async function recordExportBestEffort(
  decision: StrategyDecision,
  exportType: 'markdown' | 'pdf' | 'csv' | 'snapshot',
) {
  if (!await apiAvailable()) return;
  try {
    await fetch('/api/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `export-${crypto.randomUUID()}`,
        decisionId: decision.id,
        versionId: decision.activeVersionId,
        exportType,
        metadata: { recordedAt: new Date().toISOString() },
      }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // Export delivery is local-first; audit recording is best effort.
  }
}
