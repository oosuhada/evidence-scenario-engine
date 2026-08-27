from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Response, status
from sqlalchemy.orm import Session

from . import models
from .database import get_session
from .repositories import ShareRepository, SqlAlchemyDecisionRepository, parse_iso, scoped_child_id
from .schemas import DecisionPayload, ExportCreate, ScenarioRunCreate, ShareCreate, SkepticInput, SkepticOutput
from .skeptic import DeterministicSkepticProvider, get_skeptic_provider

app = FastAPI(title="Scenario Prism API", version="0.2.0")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "scenario-prism-api"}


@app.get("/api/decisions")
def list_decisions(session: Session = Depends(get_session)) -> list[dict]:
    return SqlAlchemyDecisionRepository(session).list()


@app.get("/api/decisions/{decision_id}")
def get_decision(decision_id: str, session: Session = Depends(get_session)) -> dict:
    payload = SqlAlchemyDecisionRepository(session).get(decision_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Decision not found")
    return payload


@app.put("/api/decisions/{decision_id}")
def save_decision(decision_id: str, payload: DecisionPayload, session: Session = Depends(get_session)) -> dict:
    if payload.id != decision_id:
        raise HTTPException(status_code=409, detail="Decision id does not match URL")
    return SqlAlchemyDecisionRepository(session).save(payload.model_dump(mode="json"))


@app.delete("/api/decisions/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_decision(decision_id: str, session: Session = Depends(get_session)) -> Response:
    SqlAlchemyDecisionRepository(session).delete(decision_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/share-links", status_code=status.HTTP_201_CREATED)
def create_share(payload: ShareCreate, session: Session = Depends(get_session)) -> dict[str, str]:
    ShareRepository(session).create(payload.token, payload.decision.model_dump(mode="json"))
    return {"token": payload.token}


@app.get("/api/share-links/{token}")
def get_share(token: str, session: Session = Depends(get_session)) -> dict:
    payload = ShareRepository(session).get(token)
    if payload is None:
        raise HTTPException(status_code=404, detail="Share link not found or revoked")
    return payload


@app.delete("/api/share-links/{token}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_share(token: str, session: Session = Depends(get_session)) -> Response:
    ShareRepository(session).revoke(token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/scenario-runs", status_code=status.HTTP_201_CREATED)
def persist_scenario_run(payload: ScenarioRunCreate, session: Session = Depends(get_session)) -> dict[str, str]:
    run = models.ScenarioRun(
        id=payload.id,
        decision_id=payload.decisionId,
        version_id=scoped_child_id(payload.decisionId, payload.versionId),
        seed=payload.seed,
        iterations=payload.iterations,
        model_version=payload.modelVersion,
        result=payload.model_dump(mode="json"),
        created_at=parse_iso(payload.generatedAt),
    )
    session.merge(run)
    session.execute(models.OutcomeDistribution.__table__.delete().where(models.OutcomeDistribution.scenario_run_id == payload.id))
    for outcome in payload.outcomes:
        for metric in outcome.get("metricOutcomes", []):
            session.add(models.OutcomeDistribution(
                scenario_run_id=payload.id,
                alternative_id=outcome["alternativeId"],
                metric_id=metric["metricId"],
                expected=metric["expected"],
                low=metric["low"],
                high=metric["high"],
                samples=metric.get("samples", []),
            ))
    session.commit()
    return {"id": payload.id}


@app.post("/api/skeptic", response_model=SkepticOutput)
async def skeptic(payload: SkepticInput, session: Session = Depends(get_session)) -> SkepticOutput:
    provider = get_skeptic_provider()
    provider_name = provider.__class__.__name__
    try:
        result = await provider.challenge(payload)
    except Exception:
        provider = DeterministicSkepticProvider()
        provider_name = "DeterministicSkepticProvider:fallback"
        result = await provider.challenge(payload)

    session.add(models.SkepticRun(
        id=f"skeptic-{uuid4()}",
        decision_id=payload.decisionId,
        version_id=payload.versionId,
        selected_alternative_id=payload.selectedAlternativeId,
        provider=provider_name,
        input_payload=payload.model_dump(mode="json"),
        output_payload=result.model_dump(mode="json"),
        created_at=datetime.now().astimezone(),
    ))
    session.commit()
    return result


@app.post("/api/exports", status_code=status.HTTP_201_CREATED)
def record_export(payload: ExportCreate, session: Session = Depends(get_session)) -> dict[str, str]:
    session.add(models.Export(
        id=payload.id,
        decision_id=payload.decisionId,
        version_id=payload.versionId,
        export_type=payload.exportType,
        metadata_json=payload.metadata,
        created_at=datetime.now().astimezone(),
    ))
    session.commit()
    return {"id": payload.id}
