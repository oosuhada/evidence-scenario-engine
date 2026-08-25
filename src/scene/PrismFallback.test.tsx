import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSampleDecision } from '../decision-model/factories';
import { runScenario } from '../scenario-engine/engine';
import { PrismFallback } from './PrismFallback';

describe('PrismFallback', () => {
  it('renders the same model score without WebGL', () => {
    const decision = createSampleDecision();
    const run = runScenario(decision);
    const outcome = run.outcomes[0];
    render(<PrismFallback outcome={outcome} />);
    expect(screen.getByLabelText('2D prism fallback')).toBeInTheDocument();
    expect(screen.getByText(String(Math.round(outcome.score)))).toBeInTheDocument();
  });
});
