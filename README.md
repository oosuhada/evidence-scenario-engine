# Scenario Prism

Standalone high-fidelity strategy simulation prototype for testing how assumptions and uncertainty reshape an AI deployment decision.

## Run locally

```bash
corepack pnpm install
corepack pnpm dev
```

Open http://localhost:3102.

## Quality checks

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

The repository is fully self-contained and has no workspace dependency on `ai-ux-mvp-lab`.
