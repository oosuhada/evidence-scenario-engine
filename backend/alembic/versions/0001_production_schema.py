"""production schema

Revision ID: 0001_production_schema
Revises:
Create Date: 2026-08-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_production_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "decisions",
        sa.Column("id", sa.String(length=120), primary_key=True),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("template_id", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("active_version_id", sa.String(length=120), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "alternatives",
        sa.Column("id", sa.String(length=160), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("base_metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    )
    op.create_index("ix_alternatives_decision_id", "alternatives", ["decision_id"])
    op.create_table(
        "assumptions",
        sa.Column("id", sa.String(length=160), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("minimum", sa.Float(), nullable=False),
        sa.Column("maximum", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=40), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("unresolved", sa.Boolean(), nullable=False),
        sa.Column("impacts", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    )
    op.create_index("ix_assumptions_decision_id", "assumptions", ["decision_id"])
    op.create_table(
        "metrics",
        sa.Column("id", sa.String(length=160), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("unit", sa.String(length=40), nullable=False),
        sa.Column("direction", sa.String(length=20), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("guardrail", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_index("ix_metrics_decision_id", "metrics", ["decision_id"])
    op.create_table(
        "evidence_items",
        sa.Column("id", sa.String(length=160), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("strength", sa.Float(), nullable=False),
        sa.Column("relevance", sa.Float(), nullable=False),
        sa.Column("stance", sa.String(length=24), nullable=False),
        sa.Column("assumption_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_evidence_items_decision_id", "evidence_items", ["decision_id"])
    op.create_table(
        "scenario_versions",
        sa.Column("id", sa.String(length=160), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=180), nullable=False),
        sa.Column("horizon_months", sa.Integer(), nullable=False),
        sa.Column("seed", sa.Integer(), nullable=False),
        sa.Column("iterations", sa.Integer(), nullable=False),
        sa.Column("model_version", sa.String(length=120), nullable=False),
        sa.Column("assumption_values", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("decision_id", "version_number", name="uq_decision_version_number"),
    )
    op.create_index("ix_scenario_versions_decision_id", "scenario_versions", ["decision_id"])
    op.create_table(
        "scenario_runs",
        sa.Column("id", sa.String(length=180), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_id", sa.String(length=160), sa.ForeignKey("scenario_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("seed", sa.Integer(), nullable=False),
        sa.Column("iterations", sa.Integer(), nullable=False),
        sa.Column("model_version", sa.String(length=120), nullable=False),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_scenario_runs_decision_id", "scenario_runs", ["decision_id"])
    op.create_index("ix_scenario_runs_version_id", "scenario_runs", ["version_id"])
    op.create_table(
        "outcome_distributions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("scenario_run_id", sa.String(length=180), sa.ForeignKey("scenario_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("alternative_id", sa.String(length=160), nullable=False),
        sa.Column("metric_id", sa.String(length=160), nullable=False),
        sa.Column("expected", sa.Float(), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("samples", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    )
    op.create_index("ix_outcome_distributions_scenario_run_id", "outcome_distributions", ["scenario_run_id"])
    op.create_table(
        "skeptic_runs",
        sa.Column("id", sa.String(length=180), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_id", sa.String(length=160), nullable=False),
        sa.Column("selected_alternative_id", sa.String(length=160), nullable=False),
        sa.Column("provider", sa.String(length=120), nullable=False),
        sa.Column("input_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("output_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_skeptic_runs_decision_id", "skeptic_runs", ["decision_id"])
    op.create_table(
        "decision_records",
        sa.Column("id", sa.String(length=180), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_id", sa.String(length=160), nullable=False),
        sa.Column("selected_alternative_id", sa.String(length=160), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("conditions", sa.Text(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_decision_records_decision_id", "decision_records", ["decision_id"])
    op.create_table(
        "exports",
        sa.Column("id", sa.String(length=180), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_id", sa.String(length=160), nullable=False),
        sa.Column("export_type", sa.String(length=60), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_exports_decision_id", "exports", ["decision_id"])
    op.create_table(
        "share_links",
        sa.Column("token", sa.String(length=180), primary_key=True),
        sa.Column("decision_id", sa.String(length=120), sa.ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_id", sa.String(length=160), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_share_links_decision_id", "share_links", ["decision_id"])


def downgrade() -> None:
    for table in [
        "share_links", "exports", "decision_records", "skeptic_runs", "outcome_distributions",
        "scenario_runs", "scenario_versions", "evidence_items", "metrics", "assumptions", "alternatives", "decisions",
    ]:
        op.drop_table(table)
