import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Sparkles } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { easing } from 'maath';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BlendFunction } from 'postprocessing';
import {
  Activity,
  AlertTriangle,
  Binary,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Cpu,
  Factory,
  Radio,
  Rotate3d,
  ScanLine,
  ShieldCheck,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Vector2, type Group } from 'three';
import { skepticResponses, streamDeterministicText } from './lib/mock-ai';
import { supportsWebGL } from './lib/shared';

type ScenarioName = 'Conservative' | 'Base' | 'Aggressive';
type Horizon = 0 | 1 | 2;
type AssumptionKey = 'dataReady' | 'operatorTraining' | 'lineIntegration';

const scenarios: ScenarioName[] = ['Conservative', 'Base', 'Aggressive'];
const horizons = ['6 MONTHS', '1 YEAR', '3 YEARS'] as const;

const scenarioProfile = {
  Conservative: { cost: 42, productivity: 48, risk: 24, adoption: 61, uncertainty: 27, label: 'Protect downside' },
  Base: { cost: 57, productivity: 70, risk: 37, adoption: 67, uncertainty: 42, label: 'Balanced rollout' },
  Aggressive: { cost: 81, productivity: 91, risk: 66, adoption: 73, uncertainty: 68, label: 'Capture learning curve' },
};

const horizonMultipliers = [0.72, 1, 1.28];

function CameraRig({ scenario, reduced }: { scenario: ScenarioName; reduced: boolean }) {
  const { camera } = useThree();
  const targetX = (scenarios.indexOf(scenario) - 1) * 0.8;

  useFrame((_, delta) => {
    if (reduced) {
      camera.position.set(targetX, 0.2, 7.4);
      camera.lookAt(0, 0, 0);
      return;
    }
    easing.damp3(camera.position, [targetX, 0.15 + targetX * 0.08, 7.4 - Math.abs(targetX) * 0.2], 0.5, delta);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function PrismObject({ scenario, uncertainty, assumptions, reduced }: {
  scenario: ScenarioName;
  uncertainty: number;
  assumptions: Record<AssumptionKey, boolean>;
  reduced: boolean;
}) {
  const group = useRef<Group>(null);
  const index = scenarios.indexOf(scenario);
  const activeAssumptions = Object.values(assumptions).filter(Boolean).length;

  useFrame((state, delta) => {
    if (!group.current) return;
    const targetScale: [number, number, number] = [
      1 + index * 0.12,
      1 + activeAssumptions * 0.08,
      1 + uncertainty * 0.0018,
    ];
    easing.damp3(group.current.scale, targetScale, 0.55, delta);
    if (!reduced) {
      group.current.rotation.y += delta * (0.08 + index * 0.025);
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.08 + (index - 1) * 0.09;
    }
  });

  return (
    <Float speed={reduced ? 0 : 1.25} rotationIntensity={reduced ? 0 : 0.16} floatIntensity={reduced ? 0 : 0.32}>
      <group ref={group} rotation={[0.12, -0.35, 0.08]}>
        <mesh scale={[1.6, 2.45, 1.15]}>
          <octahedronGeometry args={[1, 0]} />
          <MeshTransmissionMaterial
            transmission={1}
            thickness={1.45 + uncertainty / 85}
            roughness={0.08 + uncertainty / 900}
            chromaticAberration={0.05 + uncertainty / 450}
            anisotropy={0.25}
            distortion={0.08 + uncertainty / 260}
            distortionScale={0.28}
            temporalDistortion={reduced ? 0 : 0.06 + uncertainty / 700}
            samples={5}
            resolution={256}
            color={scenario === 'Aggressive' ? '#e7f0ff' : scenario === 'Conservative' ? '#f2f4f6' : '#ffffff'}
          />
        </mesh>
        <mesh scale={[1.12, 1.82, .88]} rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial color="#090d13" metalness={0.8} roughness={0.18} transparent opacity={0.32} />
        </mesh>
        <mesh scale={[1.92, .02, 1.92]} rotation={[0.04, 0.1, 0]}>
          <torusGeometry args={[1, .008, 6, 72]} />
          <meshBasicMaterial color="#9bd5ff" transparent opacity={0.48} />
        </mesh>
        <mesh scale={[1.42, .02, 1.42]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, .007, 6, 72]} />
          <meshBasicMaterial color="#f5c3ff" transparent opacity={0.38} />
        </mesh>
      </group>
    </Float>
  );
}

function DecisionScene({ scenario, uncertainty, assumptions, reduced }: {
  scenario: ScenarioName;
  uncertainty: number;
  assumptions: Record<AssumptionKey, boolean>;
  reduced: boolean;
}) {
  const chromaticOffset = useMemo(() => new Vector2(uncertainty / 42000, uncertainty / 70000), [uncertainty]);
  return (
    <Canvas camera={{ position: [0, .2, 7.4], fov: 39 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={['#030507']} />
      <fog attach="fog" args={['#030507', 5.5, 13]} />
      <ambientLight intensity={0.22} />
      <spotLight position={[-5, 4, 6]} intensity={25} angle={0.24} penumbra={0.9} color="#9dc9ff" />
      <spotLight position={[5, 1, 3]} intensity={18} angle={0.34} penumbra={1} color="#f39dff" />
      <pointLight position={[0, -3, 2]} intensity={12} color="#ffffff" />
      <CameraRig scenario={scenario} reduced={reduced} />
      <PrismObject scenario={scenario} uncertainty={uncertainty} assumptions={assumptions} reduced={reduced} />
      <Sparkles count={reduced ? 18 : 58} scale={[9, 5, 5]} size={1.1} speed={reduced ? 0 : .12} opacity={.22} color="#d8e8ff" />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.82} intensity={0.82} mipmapBlur />
        <ChromaticAberration offset={chromaticOffset} radialModulation modulationOffset={0.26} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.12} />
        <Vignette eskil={false} offset={0.18} darkness={0.9} />
      </EffectComposer>
    </Canvas>
  );
}

function MetricHUD({ label, value, suffix = '%', align = 'left', icon }: {
  label: string;
  value: number;
  suffix?: string;
  align?: 'left' | 'right';
  icon: React.ReactNode;
}) {
  return (
    <motion.div className={`metric-hud align-${align}`} layout>
      <div className="hud-label">{icon}<span>{label}</span></div>
      <div className="hud-value"><motion.strong key={value} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>{value}</motion.strong><small>{suffix}</small></div>
      <div className="hud-scale"><i style={{ width: `${Math.min(100, value)}%` }} /></div>
    </motion.div>
  );
}

export function App() {
  const reduced = Boolean(useReducedMotion());
  const webgl = useMemo(() => supportsWebGL(), []);
  const [scenario, setScenario] = useState<ScenarioName>('Base');
  const [horizon, setHorizon] = useState<Horizon>(1);
  const [assumptions, setAssumptions] = useState<Record<AssumptionKey, boolean>>({
    dataReady: true,
    operatorTraining: true,
    lineIntegration: false,
  });
  const [skepticOpen, setSkepticOpen] = useState(false);
  const [skepticText, setSkepticText] = useState('');
  const [skepticLoading, setSkepticLoading] = useState(false);
  const dragStart = useRef<number | null>(null);

  const profile = scenarioProfile[scenario];
  const multiplier = horizonMultipliers[horizon];
  const assumptionDelta = (assumptions.dataReady ? -5 : 9) + (assumptions.operatorTraining ? -6 : 11) + (assumptions.lineIntegration ? 9 : -3);
  const uncertainty = Math.max(12, Math.min(88, Math.round(profile.uncertainty + assumptionDelta)));
  const cost = Math.round(profile.cost * multiplier + (assumptions.lineIntegration ? 8 : -2));
  const productivity = Math.min(99, Math.round(profile.productivity * multiplier + (assumptions.dataReady ? 4 : -11)));
  const risk = Math.max(8, Math.min(95, Math.round(profile.risk + assumptionDelta * .75 + (horizon === 2 ? -7 : 3))));
  const adoption = Math.max(18, Math.min(96, Math.round(profile.adoption + (assumptions.operatorTraining ? 9 : -16) + horizon * 4)));
  const scenarioIndex = scenarios.indexOf(scenario);

  const changeScenario = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(2, scenarioIndex + direction));
    setScenario(scenarios[next]);
  };

  const askSkeptic = async () => {
    setSkepticOpen(true);
    setSkepticText('');
    setSkepticLoading(true);
    const response = skepticResponses[scenario];
    await streamDeterministicText(response, {
      delay: reduced ? 0 : 15,
      chunkSize: reduced ? response.length : 4,
      onChunk: (chunk) => setSkepticText((current) => current + chunk),
    });
    setSkepticLoading(false);
  };

  return (
    <main className="prism-shell">
      <div className="optical-grid" aria-hidden="true" />
      <header className="chamber-header">
        <div className="chamber-brand"><ScanLine size={17} /><span>SCENARIO PRISM</span><b>DECISION THEATER / 02</b></div>
        <div className="system-readout"><Radio size={12} /> SIMULATION LIVE · MODEL S-19</div>
        <button className="skeptic-trigger" onClick={askSkeptic}><AlertTriangle size={14} /> ASK THE SKEPTIC</button>
      </header>

      <section
        className="chamber-viewport"
        onPointerDown={(event) => { dragStart.current = event.clientX; }}
        onPointerUp={(event) => {
          if (dragStart.current === null) return;
          const delta = event.clientX - dragStart.current;
          if (Math.abs(delta) > 45) changeScenario(delta < 0 ? 1 : -1);
          dragStart.current = null;
        }}
      >
        {webgl ? (
          <Suspense fallback={<div className="render-fallback">CALIBRATING OPTICS ···</div>}>
            <DecisionScene scenario={scenario} uncertainty={uncertainty} assumptions={assumptions} reduced={reduced} />
          </Suspense>
        ) : (
          <div className="css-prism-fallback" aria-label="2D prism fallback"><i /><i /><i /></div>
        )}

        <div className="decision-title">
          <span>STRATEGIC DECISION / GENERATIVE AI INSPECTION</span>
          <h1>Deploy on the manufacturing floor?</h1>
        </div>

        <div className="scenario-rail" role="tablist" aria-label="Scenario selection">
          {scenarios.map((name) => (
            <button key={name} role="tab" aria-selected={scenario === name} className={scenario === name ? 'active' : ''} onClick={() => setScenario(name)}>
              <span>0{scenarios.indexOf(name) + 1}</span>{name}
            </button>
          ))}
        </div>

        <div className="scenario-nameplate">
          <button onClick={() => changeScenario(-1)} disabled={scenarioIndex === 0} aria-label="Previous scenario"><ChevronLeft /></button>
          <div><span>{profile.label}</span><strong>{scenario}</strong><small><Rotate3d size={11} /> DRAG PRISM TO SHIFT CASE</small></div>
          <button onClick={() => changeScenario(1)} disabled={scenarioIndex === 2} aria-label="Next scenario"><ChevronRight /></button>
        </div>

        <div className="hud-zone hud-left-top"><MetricHUD label="CAPITAL LOAD" value={cost} align="left" icon={<Factory size={12} />} /></div>
        <div className="hud-zone hud-left-bottom"><MetricHUD label="ADOPTION" value={adoption} align="left" icon={<Users size={12} />} /></div>
        <div className="hud-zone hud-right-top"><MetricHUD label="PRODUCTIVITY" value={productivity} align="right" icon={<Zap size={12} />} /></div>
        <div className="hud-zone hud-right-bottom"><MetricHUD label="DEPLOYMENT RISK" value={risk} align="right" icon={<ShieldCheck size={12} />} /></div>

        <aside className="assumption-console">
          <div className="console-title"><Binary size={13} /> ASSUMPTION MATRIX</div>
          {([
            ['dataReady', 'Production data ready'],
            ['operatorTraining', 'Paid operator training'],
            ['lineIntegration', 'Full-line phase one'],
          ] as Array<[AssumptionKey, string]>).map(([key, label]) => (
            <button key={key} className={assumptions[key] ? 'on' : ''} onClick={() => setAssumptions((current) => ({ ...current, [key]: !current[key] }))}>
              <i /><span>{label}</span><b>{assumptions[key] ? '01' : '00'}</b>
            </button>
          ))}
        </aside>

        <div className="uncertainty-gauge">
          <div className="gauge-label"><CircleGauge size={13} /> UNCERTAINTY</div>
          <strong>{uncertainty}<span>%</span></strong>
          <div className="gauge-spectrum"><i style={{ width: `${uncertainty}%` }} /></div>
          <small>OPTICAL DISTORTION IS MODEL-COUPLED</small>
        </div>
      </section>

      <section className="timeline-console">
        <div className="timeline-label"><Activity size={13} /><span>OUTCOME HORIZON</span></div>
        <div className="timeline-ruler">
          {horizons.map((label, index) => (
            <button key={label} className={horizon === index ? 'active' : ''} onClick={() => setHorizon(index as Horizon)}>
              <i /><span>{label}</span>
            </button>
          ))}
          <motion.div className="timeline-cursor" animate={{ left: `${horizon * 50}%` }} transition={{ duration: reduced ? 0 : .38, ease: [0.2, .8, .2, 1] }} />
        </div>
        <div className="decision-output"><Target size={13} /><span>{risk < 45 ? 'PROCEED / STAGED EXPANSION' : 'HOLD / DE-RISK INTEGRATION'}</span></div>
      </section>

      <AnimatePresence>
        {skepticOpen ? (
          <motion.aside className="skeptic-panel" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
            <div className="skeptic-head"><div><Cpu size={16} /><span>ADVERSARIAL MODEL / CURRENT CASE</span></div><button onClick={() => setSkepticOpen(false)} aria-label="Close skeptic"><X size={16} /></button></div>
            <span className="skeptic-case">{scenario.toUpperCase()} · {horizons[horizon]}</span>
            <h2>What breaks first?</h2>
            <p>{skepticText || 'Scanning assumptions, integration cost, operator friction, and irreversible commitments…'}{skepticLoading ? <i className="cursor-block" /> : null}</p>
            <div className="skeptic-signoff"><AlertTriangle size={12} /> CONTRARIAN VIEW · NOT A RECOMMENDATION</div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
