import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Sparkles as ThreeSparkles } from '@react-three/drei';
import { motion } from 'motion/react';
import { ArrowLeft, BadgeDollarSign, BrainCircuit, ChevronRight, Factory, ShieldAlert, Users, Zap } from 'lucide-react';
import type { Mesh } from 'three';
import { AmbientBackdrop, Eyebrow, GlassCard, GlowButton, MetricBar, PointerLight, StatusPill } from './lib/design-system';
import { skepticResponses, streamDeterministicText } from './lib/mock-ai';
import { supportsWebGL } from './lib/shared';

type ScenarioName = 'Conservative' | 'Base' | 'Aggressive';
type AssumptionKey = 'dataReady' | 'operatorTraining' | 'lineIntegration';

const scenarioOrder: ScenarioName[] = ['Conservative', 'Base', 'Aggressive'];
const scenarioMeta = {
  Conservative: { label: 'Protect downside', uncertainty: 30, tilt: -0.22 },
  Base: { label: 'Balanced rollout', uncertainty: 46, tilt: 0 },
  Aggressive: { label: 'Capture learning curve', uncertainty: 68, tilt: 0.24 },
};

function PrismObject({ scenario, uncertainty, assumptions }: { scenario: ScenarioName; uncertainty: number; assumptions: Record<AssumptionKey, boolean> }) {
  const meshRef = useRef<Mesh>(null);
  const activeCount = Object.values(assumptions).filter(Boolean).length;

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.16;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.05 + scenarioMeta[scenario].tilt;
  });

  const roughness = Math.min(0.42, 0.08 + uncertainty / 260);
  const thickness = 1.4 + activeCount * 0.28;

  return (
    <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.22}>
      <mesh ref={meshRef} scale={[2.2 + activeCount * 0.08, 2.8 - activeCount * 0.06, 1.55 + activeCount * 0.14]}>
        <octahedronGeometry args={[1, 0]} />
        <MeshTransmissionMaterial
          transmission={1}
          thickness={thickness}
          roughness={roughness}
          chromaticAberration={0.04 + uncertainty / 700}
          anisotropy={0.22}
          distortion={uncertainty / 260}
          distortionScale={0.35}
          temporalDistortion={0.08}
          ior={1.28}
          color={scenario === 'Conservative' ? '#b9e8ff' : scenario === 'Base' ? '#d9c6ff' : '#ffd1b3'}
          attenuationDistance={2.2}
          attenuationColor={scenario === 'Aggressive' ? '#ff9d83' : '#a5c6ff'}
        />
      </mesh>
      <mesh scale={[1.36, 1.8, 1.1]} rotation={[0.1, 0.35, 0.2]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={scenario === 'Base' ? '#b79dff' : '#9ed7ff'} wireframe transparent opacity={0.12} />
      </mesh>
      <ThreeSparkles count={34} scale={[6, 6, 6]} size={1.5} speed={0.2} opacity={0.22} />
    </Float>
  );
}

function PrismFallback({ scenario, uncertainty }: { scenario: ScenarioName; uncertainty: number }) {
  return (
    <div className={`prism-fallback fallback-${scenario.toLowerCase()}`} style={{ filter: `blur(${uncertainty / 180}px)` }}>
      <motion.div animate={{ rotate: [0, 12, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="fallback-shape" />
    </div>
  );
}

export function App() {
  const [scenario, setScenario] = useState<ScenarioName>('Base');
  const [months, setMonths] = useState(12);
  const [assumptions, setAssumptions] = useState<Record<AssumptionKey, boolean>>({ dataReady: true, operatorTraining: true, lineIntegration: false });
  const [skeptic, setSkeptic] = useState('');
  const [skepticLoading, setSkepticLoading] = useState(false);
  const [webgl] = useState(() => supportsWebGL());
  const dragStart = useRef<number | null>(null);

  const metrics = useMemo(() => {
    const scenarioBase = scenario === 'Conservative' ? -10 : scenario === 'Aggressive' ? 14 : 0;
    const timeFactor = months === 6 ? -8 : months === 36 ? 15 : 0;
    const ready = assumptions.dataReady ? 6 : -11;
    const training = assumptions.operatorTraining ? 8 : -12;
    const integration = assumptions.lineIntegration ? 9 : -7;
    return {
      cost: Math.max(28, Math.min(94, 57 + scenarioBase + (months === 36 ? 10 : 0) + (assumptions.lineIntegration ? 7 : 0))),
      productivity: Math.max(18, Math.min(98, 60 + scenarioBase + timeFactor + ready + training / 2)),
      risk: Math.max(12, Math.min(96, 45 + scenarioBase + (assumptions.dataReady ? -8 : 15) + (assumptions.lineIntegration ? 8 : 0))),
      adoption: Math.max(16, Math.min(97, 62 + timeFactor / 2 + training + integration / 2)),
    };
  }, [assumptions, months, scenario]);

  const uncertainty = Math.round((metrics.risk + (100 - metrics.adoption)) / 2);

  const cycleScenario = (direction: number) => {
    const index = scenarioOrder.indexOf(scenario);
    setScenario(scenarioOrder[(index + direction + scenarioOrder.length) % scenarioOrder.length]);
    setSkeptic('');
  };

  const runSkeptic = async () => {
    setSkeptic('');
    setSkepticLoading(true);
    await streamDeterministicText(skepticResponses[scenario], {
      delay: 18,
      chunkSize: 4,
      onChunk: (chunk) => setSkeptic((current) => current + chunk),
    });
    setSkepticLoading(false);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const delta = event.clientX - dragStart.current;
    if (Math.abs(delta) > 55) cycleScenario(delta > 0 ? -1 : 1);
    dragStart.current = null;
  };

  return (
    <main className="prism-shell">
      <AmbientBackdrop accent="184 152 255" />
      <PointerLight />
      <header className="prism-header">
        <div className="prism-brand">
          <a href="http://localhost:3100" aria-label="Back to launcher"><ArrowLeft size={16} /></a>
          <div><strong>Scenario Prism</strong><span>AI Strategy Decision Theater</span></div>
        </div>
        <StatusPill status="ready">Decision model synced · deterministic</StatusPill>
      </header>

      <section className="decision-title">
        <Eyebrow>Applied AI · strategic decision 01</Eyebrow>
        <h1>Should we deploy a <em>generative AI inspection system</em> on the manufacturing floor?</h1>
      </section>

      <section className="theater-layout">
        <GlassCard className="assumption-panel">
          <div className="panel-heading"><span>Decision assumptions</span><small>Toggle to deform outcome</small></div>
          <div className="assumption-list">
            <AssumptionToggle label="Training data is production-ready" active={assumptions.dataReady} onClick={() => setAssumptions((current) => ({ ...current, dataReady: !current.dataReady }))} />
            <AssumptionToggle label="Operators receive paid training" active={assumptions.operatorTraining} onClick={() => setAssumptions((current) => ({ ...current, operatorTraining: !current.operatorTraining }))} />
            <AssumptionToggle label="Full line integration in phase one" active={assumptions.lineIntegration} onClick={() => setAssumptions((current) => ({ ...current, lineIntegration: !current.lineIntegration }))} />
          </div>
          <div className="evidence-note">
            <BrainCircuit size={15} />
            <div><strong>Evidence quality</strong><p>{100 - uncertainty}% of modeled inputs have direct evidence. Refraction increases as uncertainty rises.</p></div>
          </div>
        </GlassCard>

        <div className="prism-center">
          <div className="scenario-tabs" role="tablist" aria-label="Scenario">
            {scenarioOrder.map((item) => <button key={item} role="tab" aria-selected={scenario === item} className={scenario === item ? 'active' : ''} onClick={() => { setScenario(item); setSkeptic(''); }}>{item}</button>)}
          </div>
          <div className="prism-canvas" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
            {webgl ? (
              <Canvas camera={{ position: [0, 0, 7.7], fov: 38 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
                <ambientLight intensity={0.45} />
                <pointLight position={[4, 4, 5]} intensity={12} color="#d2edff" />
                <pointLight position={[-4, -3, 2]} intensity={9} color="#b69cff" />
                <Suspense fallback={null}><PrismObject scenario={scenario} uncertainty={uncertainty} assumptions={assumptions} /></Suspense>
              </Canvas>
            ) : <PrismFallback scenario={scenario} uncertainty={uncertainty} />}
            <div className="prism-label">
              <span>{scenarioMeta[scenario].label}</span>
              <strong>{scenario}</strong>
              <small>drag prism horizontally to change scenario</small>
            </div>
            <div className="uncertainty-orbit"><span>uncertainty</span><strong>{uncertainty}%</strong></div>
          </div>
          <div className="time-control">
            <div><span>Time horizon</span><strong>{months === 6 ? '6 months' : months === 12 ? '1 year' : '3 years'}</strong></div>
            <input aria-label="Time horizon" type="range" min="0" max="2" step="1" value={months === 6 ? 0 : months === 12 ? 1 : 2} onChange={(event) => setMonths([6, 12, 36][Number(event.target.value)])} />
            <div className="time-marks"><span>6m</span><span>1y</span><span>3y</span></div>
          </div>
        </div>

        <GlassCard className="outcome-panel" intensity="clear">
          <div className="panel-heading"><span>Projected operating state</span><small>{months === 36 ? 'Year 3' : months === 12 ? 'Year 1' : 'Month 6'}</small></div>
          <div className="metric-stack">
            <MetricIcon icon={<BadgeDollarSign size={15} />}><MetricBar label="Relative cost load" value={metrics.cost} hint="Higher = more capital & integration burden" /></MetricIcon>
            <MetricIcon icon={<Zap size={15} />}><MetricBar label="Productivity uplift" value={metrics.productivity} hint="Modeled inspection throughput" /></MetricIcon>
            <MetricIcon icon={<ShieldAlert size={15} />}><MetricBar label="Deployment risk" value={metrics.risk} hint="Technical + operational exposure" /></MetricIcon>
            <MetricIcon icon={<Users size={15} />}><MetricBar label="Organization adoption" value={metrics.adoption} hint="Supervisor & operator acceptance" /></MetricIcon>
          </div>
          <div className="recommendation">
            <span><Factory size={13} /> Current read</span>
            <strong>{metrics.productivity - metrics.risk > 20 ? 'Proceed with staged expansion' : metrics.risk > 65 ? 'Delay full deployment' : 'Proceed with gated pilot'}</strong>
            <p>Recommendation updates from the same variables shaping the prism—not from a separate narrative model.</p>
          </div>
          <GlowButton onClick={runSkeptic} disabled={skepticLoading}>Ask the Skeptic</GlowButton>
        </GlassCard>
      </section>

      {skeptic || skepticLoading ? (
        <motion.section className="skeptic-strip" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div><ShieldAlert size={16} /><span>Skeptic model · {scenario}</span></div>
          <p>{skeptic}<i className={skepticLoading ? 'typing' : ''} /></p>
          <button onClick={() => setSkeptic('')} aria-label="Dismiss skeptic response">Dismiss <ChevronRight size={14} /></button>
        </motion.section>
      ) : null}
    </main>
  );
}

function AssumptionToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={`assumption-toggle ${active ? 'active' : ''}`} onClick={onClick}><span><i />{label}</span><b>{active ? 'ON' : 'OFF'}</b></button>;
}

function MetricIcon({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="metric-with-icon"><span>{icon}</span><div>{children}</div></div>;
}
