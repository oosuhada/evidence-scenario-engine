from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class DecisionPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    title: str
    question: str
    templateId: str
    createdAt: str
    updatedAt: str
    status: str
    activeVersionId: str
    alternatives: list[dict[str, Any]]
    assumptions: list[dict[str, Any]]
    metrics: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    versions: list[dict[str, Any]]
    decisionRecords: list[dict[str, Any]] = Field(default_factory=list)
    shareLinks: list[dict[str, Any]] = Field(default_factory=list)


class ShareCreate(BaseModel):
    token: str
    decision: DecisionPayload


class SkepticInput(BaseModel):
    decisionId: str
    versionId: str
    selectedAlternativeId: str
    assumptions: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    contradictions: list[dict[str, Any]]
    modelLimitations: list[str]


class SkepticOutput(BaseModel):
    vulnerableAssumption: str
    missingEvidence: str
    counterScenario: str
    falsificationTest: str
    mitigation: str


class ScenarioRunCreate(BaseModel):
    id: str
    decisionId: str
    versionId: str
    seed: int
    iterations: int = Field(ge=50, le=10000)
    modelVersion: str
    generatedAt: str
    recommendedAlternativeId: str
    decisionRule: str
    outcomes: list[dict[str, Any]]


class ExportCreate(BaseModel):
    id: str
    decisionId: str
    versionId: str
    exportType: Literal["markdown", "pdf", "csv", "snapshot"]
    metadata: dict[str, Any] = Field(default_factory=dict)
