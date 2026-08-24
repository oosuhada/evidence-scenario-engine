# Reference Adoption

## Adopted in Code

| Reference | License | Files/feature used | Changes made | Credit location |
|---|---|---|---|---|
| React Three Fiber | MIT | `src/App.tsx` `DecisionScene` | Full-screen decision chamber, controlled camera and visibility-aware frameloop | `CREDITS.md` |
| Drei | MIT | `src/App.tsx` prism scene | `MeshTransmissionMaterial`, `Float`, `Sparkles`; material parameters encode uncertainty and evidence strength | `CREDITS.md` |
| react-postprocessing | MIT | `src/App.tsx` scene pipeline | Bloom, Chromatic Aberration, Depth of Field, Noise and Vignette tied to evidence clarity/uncertainty | `CREDITS.md` |
| maath | MIT | `src/App.tsx` camera/object choreography | Damped scenario-driven camera and prism deformation | `CREDITS.md` |
| Motion | MIT | `src/App.tsx` HUD/skeptic transitions | Numeric and panel transitions with reduced-motion handling | `CREDITS.md` |

## Visual Principles Adopted

| Reference | Observed principle | Our interpretation | Where visible |
|---|---|---|---|
| Paper Shaders | Shader parameters are understandable when exposed as material vocabulary | Evidence clarity is a visible optical control rather than a hidden model number | evidence clarity gauge + prism material |
| Liquid Glass Studio | Refraction controls become meaningful when tunable against live content | Uncertainty drives distortion/fog; evidence strength drives roughness/focus | prism + fog + DoF |
| Theatre.js | Camera/light changes should communicate scenario transitions | Scenario state changes move camera/object together using deterministic damping | central chamber |
| WebGL Data Globe | Atmosphere and camera should reinforce one hero object | Sparse fog, spectral lighting and constrained camera framing | full viewport |
| ShaderGradient | Strong hero gradients can establish depth with very little chrome | Spectral cyan/magenta dispersion was studied only; no code copied | lighting palette |

## Prototype / Comparison Log

1. **Current R3F + Drei + postprocessing scene** — retained as the production prototype because it already owns geometry, optical material and post effects without duplicate canvases.
2. **Paper Shaders React API comparison** — Apache-2.0; `@paper-design/shaders-react` is about 427 KB unpacked. A separate shader canvas was rejected because it would duplicate the R3F render pipeline.
3. **Theatre.js core API comparison** — Apache-2.0; `@theatre/core` is about 903 KB unpacked. Current state-driven choreography is small and deterministic, so the timeline runtime was not added.
4. **liquid-glass-react API comparison** — MIT; about 180 KB unpacked. DOM lens/refraction is useful for interface glass, but this project needs the hero prism itself to carry the material semantics.

## Investigated but Rejected

| Reference | Reason rejected |
|---|---|
| Paper Shaders | Apache-2.0 verified; useful vocabulary, but a second canvas/shader runtime would duplicate R3F. Visual principle only. |
| Liquid Glass Studio | MIT verified; implementation is a separate WebGL studio. Parameter semantics were adopted, source was not copied. |
| Theatre.js | Apache-2.0 verified; additional runtime is unnecessary for three deterministic scenario states. |
| Lamina | MIT verified; README maintenance notice and overlap with `MeshTransmissionMaterial` made it unnecessary. |
| liquid-glass-react | MIT verified; DOM-oriented lens is not the central 3D material needed here. |
| WebGL Data Globe | MIT verified; navigation/atmosphere principles only, globe code is unrelated to the decision object. |
| ShaderGradient | No LICENSE file detected; RED. Visual observation only and no source code copied. |

## Investigated Candidate Set

README, current LICENSE file and demo/homepage were checked on 2026-08-23 for: `paper-design/shaders`, `iyinchao/liquid-glass-studio`, `pmndrs/react-three-fiber`, `pmndrs/drei`, `pmndrs/react-postprocessing`, `theatre-js/theatre`, `pmndrs/lamina`, `rdev/liquid-glass-react`, `shehzadres/Webgl-Data-Globe`, and `ruucm/shadergradient`.

## License Verification

- [x] LICENSE opened and read
- [x] Attribution requirements preserved
- [x] No unknown-license code copied
- [x] No incompatible copyleft dependency introduced
- [x] CREDITS.md updated

