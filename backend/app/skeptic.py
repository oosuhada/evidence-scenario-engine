from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Any

import httpx

from .schemas import SkepticInput, SkepticOutput


class SkepticProvider(ABC):
    @abstractmethod
    async def challenge(self, payload: SkepticInput) -> SkepticOutput:
        raise NotImplementedError


class DeterministicSkepticProvider(SkepticProvider):
    async def challenge(self, payload: SkepticInput) -> SkepticOutput:
        assumptions = sorted(
            payload.assumptions,
            key=lambda item: float(item.get("confidence", 0.5)) + (0 if item.get("unresolved", True) else 0.25),
        )
        vulnerable = assumptions[0] if assumptions else None
        name = vulnerable.get("name", "an unresolved assumption") if vulnerable else "an unresolved assumption"
        linked_evidence = [item for item in payload.evidence if vulnerable and vulnerable.get("id") in item.get("assumptionIds", [])]
        return SkepticOutput(
            vulnerableAssumption=f"{name} is the weakest currently configured assumption by confidence and resolution state.",
            missingEvidence=(
                f"Evidence linked to {name} exists but should be independently validated against the adverse bound."
                if linked_evidence else f"No evidence is linked to {name}; the model is relying on an unsupported input."
            ),
            counterScenario="Move the weakest assumption toward its adverse configured bound and rerun the deterministic engine before treating the current ranking as stable.",
            falsificationTest=f"Define a direct operational measurement for {name}, pre-register an adverse threshold, and create a new scenario version if that threshold is crossed.",
            mitigation="Keep the commitment reversible, instrument the weak assumption, and require a versioned rerun before expanding scope.",
        )


class HttpStructuredSkepticProvider(SkepticProvider):
    def __init__(self, endpoint: str, token: str | None = None):
        self.endpoint = endpoint
        self.token = token

    async def challenge(self, payload: SkepticInput) -> SkepticOutput:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        structured_contract: dict[str, Any] = {
            "task": "Challenge assumptions and evidence only. Do not change, invent, or recalculate numeric scenario outcomes.",
            "output_schema": SkepticOutput.model_json_schema(),
            "input": payload.model_dump(),
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(7.0, connect=2.5)) as client:
            response = await client.post(self.endpoint, json=structured_contract, headers=headers)
            response.raise_for_status()
            return SkepticOutput.model_validate(response.json())


def get_skeptic_provider() -> SkepticProvider:
    endpoint = os.getenv("SCENARIO_PRISM_SKEPTIC_URL", "").strip()
    token = os.getenv("SCENARIO_PRISM_SKEPTIC_TOKEN", "").strip() or None
    if endpoint:
        return HttpStructuredSkepticProvider(endpoint, token)
    return DeterministicSkepticProvider()
