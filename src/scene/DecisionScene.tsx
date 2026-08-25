import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Edges,
  Environment,
  Float,
  Lightformer,
  MeshTransmissionMaterial,
  Sparkles,
} from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { easing } from 'maath';
import { BlendFunction } from 'postprocessing';
import { Vector2, type Group, type Mesh } from 'three';
import type { AlternativeOutcome, StrategyDecision } from '../decision-model/types';

export interface DecisionSceneProps {
  decision: StrategyDecision;
  outcome: AlternativeOutcome;
  activeAlternativeIndex: number;
  divergence: number;
  reducedMotion: boolean;
  lowPower: boolean;
  documentVisible: boolean;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

function CameraRig({ index, reducedMotion }: { index: number; reducedMotion: boolean }) {
  const { camera } = useThree();
  const targetX = (index - 1) * 0.34;

  useFrame((_, delta) => {
    if (reducedMotion) {
      camera.position.set(targetX, 0.18, 6.25);
      camera.lookAt(0, 0.05, 0);
      return;
    }
    easing.damp3(camera.position, [targetX, 0.18, 6.25], 0.65, delta);
    camera.lookAt(0, 0.05, 0);
  });
  return null;
}

function OpticalPrism({
  outcome,
  unresolvedCount,
  divergence,
  activeAlternativeIndex,
  reducedMotion,
  simplified,
}: {
  outcome: AlternativeOutcome;
  unresolvedCount: number;
  divergence: number;
  activeAlternativeIndex: number;
  reducedMotion: boolean;
  simplified: boolean;
}) {
  const group = useRef<Group>(null);
  const inner = useRef<Mesh>(null);
  const evidenceInsufficiency = 1 - outcome.evidenceStrength / 100;
  const uncertainty = outcome.uncertainty / 100;
  const expectedScale = Math.max(0.92, Math.min(1.24, 0.95 + outcome.score / 420));
  const tilt = (activeAlternativeIndex - 1) * 0.11;
  const innerScale = Math.max(0.54, 0.78 - divergence * 0.0022);

  useFrame((state, delta) => {
    if (!group.current) return;
    easing.damp3(group.current.scale, [expectedScale, expectedScale * 1.05, expectedScale], 0.55, delta);
    easing.dampE(group.current.rotation, [0.12 + tilt, -0.32, tilt * 0.5], 0.7, delta);
    if (!reducedMotion) group.current.rotation.y += delta * (0.045 + uncertainty * 0.06);
    if (inner.current && unresolvedCount > 0 && !reducedMotion) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.1) * Math.min(0.035, unresolvedCount * 0.007);
      inner.current.scale.setScalar(innerScale * pulse);
    } else if (inner.current) {
      inner.current.scale.setScalar(innerScale);
    }
  });

  return (
    <Float speed={reducedMotion ? 0 : 0.72} rotationIntensity={reducedMotion ? 0 : 0.07} floatIntensity={reducedMotion ? 0 : 0.15}>
      <group ref={group} rotation={[0.12 + tilt, -0.32, 0]}>
        <mesh scale={[1.42, 2.06, 1.08]}>
          <octahedronGeometry args={[1, 0]} />
          {simplified ? (
            <meshPhysicalMaterial
              color={outcome.guardrailPass ? '#7bcfff' : '#ef91a8'}
              emissive={outcome.guardrailPass ? '#194e6c' : '#682a3a'}
              emissiveIntensity={0.32}
              roughness={0.14 + evidenceInsufficiency * 0.46}
              metalness={0.18}
              transparent
              opacity={0.52 + (1 - evidenceInsufficiency) * 0.18}
              clearcoat={0.7}
              clearcoatRoughness={0.12 + evidenceInsufficiency * 0.2}
            />
          ) : (
            <MeshTransmissionMaterial
              transmission={0.84}
              thickness={1.8}
              roughness={0.06 + evidenceInsufficiency * 0.34}
              chromaticAberration={0.018 + uncertainty * 0.16}
              anisotropy={0.38}
              distortion={0.04 + uncertainty * 0.22}
              distortionScale={0.15 + uncertainty * 0.25}
              temporalDistortion={reducedMotion ? 0 : 0.02 + uncertainty * 0.04}
              samples={4}
              resolution={256}
              color={outcome.guardrailPass ? '#d8efff' : '#ffd9e2'}
              attenuationColor={outcome.guardrailPass ? '#66aee6' : '#e47b97'}
              attenuationDistance={2.3}
              ior={1.18 + uncertainty * 0.22}
              backside
            />
          )}
          <Edges scale={1.003} threshold={10} color={outcome.guardrailPass ? '#dff5ff' : '#ffdce6'} />
        </mesh>

        <mesh ref={inner} scale={innerScale} rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color="#152637"
            emissive={outcome.guardrailPass ? '#2b85b9' : '#b64f68'}
            emissiveIntensity={0.42 + (1 - evidenceInsufficiency) * 0.38}
            metalness={0.46}
            roughness={0.22}
            transparent
            opacity={0.82}
          />
          <Edges scale={1.01} threshold={10} color="#86cfff" />
        </mesh>

        <mesh scale={[1.78, 0.012, 1.78]} rotation={[0.02, 0.08, 0]}>
          <torusGeometry args={[1, 0.008, 6, 96]} />
          <meshBasicMaterial color="#8edaff" transparent opacity={0.64} />
        </mesh>
        <mesh scale={[1.28 + divergence * 0.002, 0.012, 1.28 + divergence * 0.002]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, 0.007, 6, 96]} />
          <meshBasicMaterial color="#f1b6ff" transparent opacity={0.56} />
        </mesh>
      </group>
    </Float>
  );
}

export default function DecisionScene({
  decision,
  outcome,
  activeAlternativeIndex,
  divergence,
  reducedMotion,
  lowPower,
  documentVisible,
  onContextLost,
  onContextRestored,
}: DecisionSceneProps) {
  const chromaticOffset = useMemo(
    () => new Vector2(outcome.uncertainty / 28000, outcome.uncertainty / 46000),
    [outcome.uncertainty],
  );
  const unresolvedCount = decision.assumptions.filter((assumption) => assumption.unresolved).length;
  const staticFrame = reducedMotion || lowPower;

  return (
    <div className="scenario-canvas" data-scenario-canvas>
      <Canvas
        camera={{ position: [0, 0.18, 6.25], fov: 42, near: 0.1, far: 40 }}
        dpr={lowPower ? [1, 1.15] : [1, 1.55]}
        frameloop={documentVisible ? 'demand' : 'never'}
        gl={{
          antialias: !lowPower,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: lowPower ? 'low-power' : 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            onContextLost?.();
          });
          gl.domElement.addEventListener('webglcontextrestored', () => onContextRestored?.());
        }}
      >
        <color attach="background" args={['#070b11']} />
        <fog attach="fog" args={['#070b11', 7.5, 15]} />
        <ambientLight intensity={0.72} color="#b9d9f2" />
        <directionalLight position={[-4, 5, 4]} intensity={3.5} color="#c8e8ff" />
        <spotLight position={[4.4, 2.4, 3.8]} intensity={58} angle={0.38} penumbra={0.84} color="#f5b7ff" />
        <spotLight position={[-4.2, -1.4, 5]} intensity={46} angle={0.42} penumbra={0.9} color="#73c8ff" />
        <pointLight position={[0, -3, 2]} intensity={20} color="#ffffff" />

        <Environment resolution={128} frames={1}>
          <Lightformer intensity={4} position={[0, 5, -4]} scale={[6, 1, 1]} color="#f0f7ff" />
          <Lightformer intensity={5} position={[-5, 0, 1]} scale={[1, 4, 1]} color="#78c8ff" />
          <Lightformer intensity={4} position={[5, 1, 1]} scale={[1, 4, 1]} color="#e9a8ff" />
          <Lightformer intensity={2} position={[0, -4, 2]} scale={[5, 1, 1]} color="#5f9dd0" />
        </Environment>

        <CameraRig index={activeAlternativeIndex} reducedMotion={staticFrame} />
        <OpticalPrism
          outcome={outcome}
          unresolvedCount={unresolvedCount}
          divergence={divergence}
          activeAlternativeIndex={activeAlternativeIndex}
          reducedMotion={staticFrame}
          simplified={staticFrame}
        />
        <Sparkles
          count={staticFrame ? 18 : 52}
          scale={[8, 5, 5]}
          size={1.1}
          speed={staticFrame ? 0 : 0.08}
          opacity={0.08 + outcome.evidenceStrength / 900}
          color="#d8e8ff"
        />

        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.38} luminanceSmoothing={0.82} intensity={staticFrame ? 0.72 : 1.05} mipmapBlur={!staticFrame} />
          <ChromaticAberration offset={chromaticOffset} radialModulation modulationOffset={0.22} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={staticFrame ? 0.035 : 0.065} />
          <Vignette eskil={false} offset={0.15} darkness={0.64} />
        </EffectComposer>
      </Canvas>
      <div className="prism-visibility-halo" aria-hidden="true" />
    </div>
  );
}
