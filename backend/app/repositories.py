from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from . import models


def parse_iso(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


class DecisionRepository(ABC):
    @abstractmethod
    def list(self) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def get(self, decision_id: str) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, decision_id: str) -> bool:
        raise NotImplementedError


class SqlAlchemyDecisionRepository(DecisionRepository):
    def __init__(self, session: Session):
        self.session = session

    def list(self) -> list[dict[str, Any]]:
        rows = self.session.scalars(select(models.Decision).order_by(models.Decision.updated_at.desc())).all()
        return [row.snapshot for row in rows]

    def get(self, decision_id: str) -> dict[str, Any] | None:
        row = self.session.get(models.Decision, decision_id)
        return row.snapshot if row else None

    def save(self, payload: dict[str, Any]) -> dict[str, Any]:
        decision_id = payload["id"]
        row = self.session.get(models.Decision, decision_id)
        if row is None:
            row = models.Decision(
                id=decision_id,
                title=payload["title"],
                question=payload["question"],
                template_id=payload.get("templateId", "blank"),
                status=payload.get("status", "draft"),
                active_version_id=payload["activeVersionId"],
                snapshot=payload,
                created_at=parse_iso(payload["createdAt"]),
                updated_at=parse_iso(payload["updatedAt"]),
            )
            self.session.add(row)
        else:
            row.title = payload["title"]
            row.question = payload["question"]
            row.template_id = payload.get("templateId", "blank")
            row.status = payload.get("status", "draft")
            row.active_version_id = payload["activeVersionId"]
            row.snapshot = payload
            row.updated_at = parse_iso(payload["updatedAt"])

        self._sync_children(decision_id, payload)
        self.session.commit()
        return payload

    def _sync_children(self, decision_id: str, payload: dict[str, Any]) -> None:
        for model in (models.Alternative, models.Assumption, models.Metric, models.EvidenceItem, models.ScenarioVersion, models.DecisionRecord):
            self.session.execute(delete(model).where(model.decision_id == decision_id))

        for item in payload.get("alternatives", []):
            self.session.add(models.Alternative(
                id=item["id"], decision_id=decision_id, name=item["name"],
                description=item.get("description", ""), base_metrics=item.get("baseMetrics", {}),
            ))

        for item in payload.get("assumptions", []):
            self.session.add(models.Assumption(
                id=item["id"], decision_id=decision_id, name=item["name"],
                description=item.get("description", ""), value=item["value"],
                minimum=item["min"], maximum=item["max"], unit=item.get("unit", ""),
                confidence=item.get("confidence", 0.5), unresolved=item.get("unresolved", True),
                impacts=item.get("impacts", []),
            ))

        for item in payload.get("metrics", []):
            self.session.add(models.Metric(
                id=item["id"], decision_id=decision_id, name=item["name"],
                unit=item.get("unit", ""), direction=item["direction"],
                weight=item["weight"], guardrail=item.get("guardrail"),
            ))

        for item in payload.get("evidence", []):
            self.session.add(models.EvidenceItem(
                id=item["id"], decision_id=decision_id, title=item["title"], source=item["source"],
                note=item.get("note", ""), strength=item["strength"], relevance=item["relevance"],
                stance=item["stance"], assumption_ids=item.get("assumptionIds", []),
                added_at=parse_iso(item["addedAt"]),
            ))

        for item in payload.get("versions", []):
            self.session.add(models.ScenarioVersion(
                id=item["id"], decision_id=decision_id, version_number=item["number"],
                label=item["label"], horizon_months=item["horizonMonths"], seed=item["seed"],
                iterations=item["iterations"], model_version=item["modelVersion"],
                assumption_values=item.get("assumptionValues", {}), notes=item.get("notes", ""),
                created_at=parse_iso(item["createdAt"]),
            ))

        for item in payload.get("decisionRecords", []):
            self.session.add(models.DecisionRecord(
                id=item["id"], decision_id=decision_id, version_id=item["versionId"],
                selected_alternative_id=item["selectedAlternativeId"], rationale=item["rationale"],
                conditions=item.get("conditions", ""), recorded_at=parse_iso(item["recordedAt"]),
            ))

    def delete(self, decision_id: str) -> bool:
        row = self.session.get(models.Decision, decision_id)
        if row is None:
            return False
        self.session.delete(row)
        self.session.commit()
        return True


class ShareRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, token: str, decision: dict[str, Any]) -> None:
        active_version_id = decision["activeVersionId"]
        row = self.session.get(models.ShareLink, token)
        if row is None:
            row = models.ShareLink(
                token=token,
                decision_id=decision["id"],
                version_id=active_version_id,
                snapshot=decision,
                created_at=datetime.now().astimezone(),
                revoked_at=None,
            )
            self.session.add(row)
        else:
            row.snapshot = decision
            row.version_id = active_version_id
            row.revoked_at = None
        self.session.commit()

    def get(self, token: str) -> dict[str, Any] | None:
        row = self.session.get(models.ShareLink, token)
        if row is None or row.revoked_at is not None:
            return None
        return row.snapshot

    def revoke(self, token: str) -> bool:
        row = self.session.get(models.ShareLink, token)
        if row is None:
            return False
        row.revoked_at = datetime.now().astimezone()
        self.session.commit()
        return True
