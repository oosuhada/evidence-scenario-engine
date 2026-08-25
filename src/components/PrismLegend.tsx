export function PrismLegend() {
  return (
    <div className="prism-legend" aria-label="Prism visual encoding legend">
      <span>VISUAL ENCODING</span>
      <dl>
        <div><dt>Surface roughness</dt><dd>Evidence insufficiency</dd></div>
        <div><dt>Inner gap</dt><dd>Scenario divergence</dd></div>
        <div><dt>Chromatic spread</dt><dd>Uncertainty</dd></div>
        <div><dt>Object volume</dt><dd>Weighted outcome scale</dd></div>
        <div><dt>Tilt</dt><dd>Alternative position</dd></div>
        <div><dt>Core pulse</dt><dd>Unresolved assumptions</dd></div>
      </dl>
    </div>
  );
}
