# Evidence Scenario Engine

**A deterministic decision workbench for exploring assumptions, uncertainty, evidence, and recommendation stability.**  
**가정, 불확실성, 근거, 추천 안정성을 함께 탐색하는 deterministic decision workbench입니다.**

**Live demo / 라이브 데모:** https://scenario.oosu.dev/

## Overview / 개요

Evidence Scenario Engine asks: **can a decision tool show not only what wins, but when and why the winner changes?** It keeps calculations deterministic under declared assumptions while separating evidence quality, uncertainty, critique, and the final human decision.

Evidence Scenario Engine은 **무엇이 이기는지만이 아니라, 언제 왜 승자가 바뀌는지 보여줄 수 있는가?**를 다룹니다. 선언된 assumption 아래 계산은 deterministic하게 유지하고, evidence quality, uncertainty, critique, 최종 human decision을 서로 분리합니다.

A fresh deployment starts with four saved example decisions—manufacturing AI rollout, vendor selection, factory automation, and product launch—so the workbench is useful before a visitor creates anything.

첫 방문부터 Manufacturing AI Rollout, Vendor Selection, Factory Automation, Product Launch 네 개의 저장된 example decision을 제공해 빈 모델링 화면부터 시작하지 않도록 했습니다.

## Saved example decisions / 저장된 예시 의사결정

![Saved example decisions on first visit](docs/portfolio/01-saved-example-decisions.png)

The examples are synthetic starting structures, not empirical forecasts. They exist to make the model mechanics inspectable immediately.

예시 데이터는 empirical forecast가 아니라 모델 구조를 빠르게 이해하기 위한 synthetic starting structure입니다.

## Core interactions / 핵심 인터랙션

### 49-cell Decision Boundary / 49셀 의사결정 경계

The 7×7 field runs the real deterministic scenario engine at 49 combinations of two automatically selected assumptions. The axes are chosen to expose the most informative leader/guardrail boundary rather than simply the highest-impact pair.

7×7 Field는 자동으로 선택된 두 assumption의 49개 조합에서 실제 deterministic scenario engine을 실행합니다. 단순히 impact가 큰 축이 아니라 leader switch와 guardrail 변화를 가장 잘 드러내는 축을 선택합니다.

![Live 49-cell decision boundary](docs/portfolio/02-decision-boundary-field.png)

Clicking a cell writes those assumption values into the live decision state. The recommendation, comparison views, sensitivity results, and 3D prism recompute from the same state.

Cell을 클릭하면 해당 assumption value가 실제 decision state에 적용되며 recommendation, comparison, sensitivity, 3D prism이 같은 state에서 다시 계산됩니다.

![Live leader switch after selecting a boundary cell](docs/portfolio/03-live-boundary-switch.png)

### Stability & Investigation / 안정성 및 검증 조사

The paired-assumption stability map shows low/base/high regions, while validation priority can create an evidence investigation item for a weak or decision-sensitive assumption.

Paired-assumption Stability Map은 low/base/high 영역을 비교하고, Validation Priority에서는 근거가 약하거나 decision-sensitive한 assumption을 실제 evidence investigation item으로 전환할 수 있습니다.

![Stability and investigation workflow](docs/portfolio/04-stability-investigation.png)

## Working flow / 작업 흐름

```text
Create or open decision / Decision 생성·열기
→ define alternatives / 대안 정의
→ define metrics & guardrails / Metric·Guardrail 정의
→ set assumption ranges / Assumption 범위 설정
→ link evidence / Evidence 연결
→ run deterministic scenarios / Scenario 실행
→ inspect sensitivity & boundary / Sensitivity·Boundary 확인
→ create validation investigation / 검증 조사 생성
→ compare versions / Version 비교
→ record human decision / 사람의 최종 결정 기록
```

## What is implemented / 구현 내용

- Deterministic seeded scenario engine with weighted metrics and guardrails.  
  Weighted Metric과 Guardrail을 사용하는 seeded deterministic scenario engine.
- Assumption ranges, confidence, evidence linkage, unresolved state, and sensitivity analysis.  
  Assumption range, confidence, evidence linkage, unresolved state, sensitivity analysis.
- Base/Upside/Downside/Stress plus custom named scenario sets and scenario matrix.  
  Base/Upside/Downside/Stress 및 custom named scenario set, scenario matrix.
- 7×7 live decision boundary and paired-assumption stability map.  
  7×7 live decision boundary와 paired-assumption stability map.
- Validation Priority → Evidence Investigation workflow.  
  Validation Priority → Evidence Investigation workflow.
- Version comparison, skeptic critique, revisit conditions, human decision record, export/share.  
  Version comparison, skeptic critique, revisit condition, human decision record, export/share.

## Architecture & Topics / 아키텍처 및 주제

**Architecture / 아키텍처**  
[`deterministic-simulation`](https://github.com/topics/deterministic-simulation) · [`decision-engine`](https://github.com/topics/decision-engine) · [`scenario-modeling`](https://github.com/topics/scenario-modeling) · [`sensitivity-analysis`](https://github.com/topics/sensitivity-analysis) · [`versioned-state`](https://github.com/topics/versioned-state) · [`human-in-the-loop`](https://github.com/topics/human-in-the-loop) · [`full-stack`](https://github.com/topics/full-stack) · [`data-visualization`](https://github.com/topics/data-visualization)

**Project context / 프로젝트 맥락**  
[`decision-intelligence`](https://github.com/topics/decision-intelligence) · [`scenario-planning`](https://github.com/topics/scenario-planning) · [`strategic-planning`](https://github.com/topics/strategic-planning) · [`decision-support`](https://github.com/topics/decision-support) · [`uncertainty`](https://github.com/topics/uncertainty) · [`risk-analysis`](https://github.com/topics/risk-analysis) · [`what-if-analysis`](https://github.com/topics/what-if-analysis) · [`evidence-based-decision-making`](https://github.com/topics/evidence-based-decision-making) · [`explainable-ai`](https://github.com/topics/explainable-ai) · [`simulation`](https://github.com/topics/simulation)

**Implementation stack / 구현 스택**  
[`react`](https://github.com/topics/react) · [`typescript`](https://github.com/topics/typescript) · [`react-three-fiber`](https://github.com/topics/react-three-fiber) · [`threejs`](https://github.com/topics/threejs) · [`fastapi`](https://github.com/topics/fastapi) · [`postgresql`](https://github.com/topics/postgresql) · [`vite`](https://github.com/topics/vite) · [`zod`](https://github.com/topics/zod)
