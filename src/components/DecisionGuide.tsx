import { ArrowRight, Check, X } from 'lucide-react';

const steps = [
  { title: 'Read the decision, not the prism', body: 'Start with the question, alternatives, and current model score. The prism is only another view of the same model state.', target: '.decision-stage' },
  { title: 'Inspect assumptions and evidence', body: 'Change an assumption on the right and compare the evidence ledger. Recompute to see which outcomes move and why.', target: '.inspection-rail' },
  { title: 'Test the weakest assumption first', body: 'Validation Priority ranks assumptions by sensitivity, evidence gap, and unresolved uncertainty so the next research action is explicit.', target: '.validation-priority' },
  { title: 'Challenge before recording', body: 'Use Challenge to surface missing evidence and a falsification test, then record a human decision with a revisit trigger.', target: '.rail-actions' },
];

type Props = { step: number; onStep: (step: number) => void; onClose: () => void };

export function DecisionGuide({ step, onStep, onClose }: Props) {
  const complete = step >= steps.length;
  const current = steps[Math.min(step, steps.length - 1)];
  const go = (next: number) => {
    onStep(next);
    const target = steps[next]?.target;
    if (target) window.setTimeout(() => document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
  };
  return <aside className="decision-guide">
    <div className="decision-guide-head"><span>GUIDED SYNTHETIC CASE</span><button onClick={onClose} aria-label="Close guide"><X size={14} /></button></div>
    {complete ? <div className="decision-guide-done"><Check size={18} /><div><strong>Ready to replace the reference case.</strong><p>Create a blank decision or import CSV/JSON, then replace every assumption and evidence item with domain data.</p></div></div> : <>
      <div className="decision-guide-step"><b>{step + 1}</b><span>/ {steps.length}</span></div>
      <h3>{current.title}</h3><p>{current.body}</p>
      <div className="decision-guide-actions">{step > 0 ? <button onClick={() => go(step - 1)}>Back</button> : <span />}<button className="primary" onClick={() => go(step + 1)}>{step === steps.length - 1 ? 'Finish' : 'Next'}<ArrowRight size={13} /></button></div>
    </>}
  </aside>;
}
