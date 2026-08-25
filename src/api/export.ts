import type { ScenarioRun, StrategyDecision } from '../decision-model/types';

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'decision';
}

export function buildDecisionMemo(decision: StrategyDecision, run: ScenarioRun) {
  const version = decision.versions.find((entry) => entry.id === run.versionId);
  const recommended = decision.alternatives.find((entry) => entry.id === run.recommendedAlternativeId);
  const lines = [
    `# ${decision.title}`,
    '',
    `**Decision question:** ${decision.question}`,
    '',
    `**Scenario version:** ${version?.label ?? run.versionId} · model ${run.modelVersion} · seed ${run.seed} · ${run.iterations} iterations`,
    '',
    '## Decision model result',
    '',
    `Recommended under configured rules: **${recommended?.name ?? 'No recommendation'}**`,
    '',
    run.decisionRule,
    '',
    '## Alternatives',
    '',
    '| Alternative | Score | Uncertainty | Guardrails |',
    '|---|---:|---:|---|',
    ...run.outcomes.map((outcome) => {
      const alternative = decision.alternatives.find((entry) => entry.id === outcome.alternativeId);
      return `| ${alternative?.name ?? outcome.alternativeId} | ${outcome.score.toFixed(1)} | ${outcome.uncertainty.toFixed(1)}% | ${outcome.guardrailPass ? 'Pass' : 'Breach'} |`;
    }),
    '',
    '## Assumptions',
    '',
    '| Assumption | Value | Confidence | Evidence links |',
    '|---|---:|---:|---:|',
    ...decision.assumptions.map((assumption) => `| ${assumption.name} | ${assumption.value}${assumption.unit} | ${Math.round(assumption.confidence * 100)}% | ${decision.evidence.filter((item) => item.assumptionIds.includes(assumption.id)).length} |`),
    '',
    '## Evidence ledger',
    '',
    ...decision.evidence.map((item) => `- **${item.title}** — ${item.source}. ${item.note} (${item.stance}; strength ${Math.round(item.strength * 100)}%)`),
    '',
    '## Model limitations',
    '',
    '- Outputs are deterministic calculations conditioned on the configured alternatives, formulas, assumptions, evidence weights, horizon, seed, and iteration count.',
    '- Outcome ranges represent modeled uncertainty. They are not calibrated probabilities and must not be presented as scientific forecasts.',
    '- Evidence strength is a user-curated input and does not independently verify source quality.',
    '- The skeptic can challenge the model but cannot change numeric outcomes.',
    '',
    '## Recorded decision',
    '',
    decision.decisionRecords.length > 0
      ? decision.decisionRecords.map((record) => `- ${record.recordedAt}: ${record.rationale}${record.conditions ? ` Conditions: ${record.conditions}` : ''}`).join('\n')
      : 'No final decision has been recorded.',
  ];
  return lines.join('\n');
}

export function downloadDecisionMemo(decision: StrategyDecision, run: ScenarioRun) {
  downloadBlob(buildDecisionMemo(decision, run), 'text/markdown;charset=utf-8', `${safeFilename(decision.title)}-memo.md`);
}

export function downloadAssumptionsCsv(decision: StrategyDecision) {
  const rows = [
    ['assumption', 'value', 'unit', 'min', 'max', 'confidence', 'unresolved', 'evidence_count'],
    ...decision.assumptions.map((assumption) => [
      assumption.name,
      assumption.value,
      assumption.unit,
      assumption.min,
      assumption.max,
      assumption.confidence,
      assumption.unresolved,
      decision.evidence.filter((item) => item.assumptionIds.includes(assumption.id)).length,
    ]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadBlob(csv, 'text/csv;charset=utf-8', `${safeFilename(decision.title)}-assumptions.csv`);
}

export function printDecisionMemo() {
  window.print();
}

export function downloadScenarioSnapshot() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-scenario-canvas] canvas');
  if (!canvas) throw new Error('3D canvas is not currently available. Switch to the prism view before exporting an image.');
  const anchor = document.createElement('a');
  anchor.href = canvas.toDataURL('image/png');
  anchor.download = 'scenario-prism-snapshot.png';
  anchor.click();
}
