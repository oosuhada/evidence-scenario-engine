import type { AlternativeOutcome } from '../decision-model/types';

export function PrismFallback({ outcome, label = '2D prism fallback' }: { outcome: AlternativeOutcome; label?: string }) {
  const blur = Math.max(0, (100 - outcome.evidenceStrength) / 26);
  const spread = Math.max(0, outcome.uncertainty / 8);
  return (
    <div
      className="css-prism-fallback"
      aria-label={label}
      style={{ '--prism-blur': `${blur}px`, '--prism-spread': `${spread}px` } as React.CSSProperties}
    >
      <i />
      <i />
      <i />
      <strong>{Math.round(outcome.score)}</strong>
      <span>MODEL SCORE</span>
    </div>
  );
}
