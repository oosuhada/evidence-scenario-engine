import { z } from 'zod';

const metricSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  unit: z.string(),
  direction: z.enum(['maximize', 'minimize']),
  weight: z.number().min(0).max(1),
  guardrail: z.object({
    operator: z.enum(['lte', 'gte']),
    threshold: z.number(),
    label: z.string().min(1),
  }).optional(),
});

const alternativeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  baseMetrics: z.record(z.number()),
});

const assumptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  value: z.number(),
  min: z.number(),
  max: z.number(),
  unit: z.string(),
  confidence: z.number().min(0).max(1),
  unresolved: z.boolean(),
  impacts: z.array(z.object({
    metricId: z.string().min(1),
    effectAtMin: z.number(),
    effectAtMax: z.number(),
  })),
}).refine((value) => value.min <= value.value && value.value <= value.max, {
  message: 'Assumption value must be inside its configured range.',
});

const evidenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.string().min(1),
  note: z.string(),
  strength: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),
  stance: z.enum(['supports', 'contradicts', 'neutral']),
  assumptionIds: z.array(z.string()),
  addedAt: z.string(),
});

const versionSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  label: z.string().min(1),
  createdAt: z.string(),
  horizonMonths: z.number().positive(),
  seed: z.number().int(),
  iterations: z.number().int().min(50).max(10000),
  modelVersion: z.string().min(1),
  assumptionValues: z.record(z.number()),
  notes: z.string(),
});

const decisionRecordSchema = z.object({
  id: z.string().min(1),
  recordedAt: z.string(),
  selectedAlternativeId: z.string().min(1),
  rationale: z.string().min(1),
  conditions: z.string(),
  versionId: z.string().min(1),
});

const shareLinkSchema = z.object({
  token: z.string().min(1),
  createdAt: z.string(),
  revokedAt: z.string().optional(),
  versionId: z.string().min(1),
});

export const strategyDecisionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  question: z.string().min(1),
  description: z.string(),
  templateId: z.enum(['blank', 'ai-adoption', 'vendor-selection', 'factory-automation', 'product-launch']),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(['draft', 'recorded']),
  alternatives: z.array(alternativeSchema),
  assumptions: z.array(assumptionSchema),
  metrics: z.array(metricSchema),
  evidence: z.array(evidenceSchema),
  versions: z.array(versionSchema).min(1),
  activeVersionId: z.string().min(1),
  decisionRecords: z.array(decisionRecordSchema),
  shareLinks: z.array(shareLinkSchema),
  notes: z.string(),
});

export const skepticResultSchema = z.object({
  vulnerableAssumption: z.string().min(1),
  missingEvidence: z.string().min(1),
  counterScenario: z.string().min(1),
  falsificationTest: z.string().min(1),
  mitigation: z.string().min(1),
});

export const importDecisionSchema = strategyDecisionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  shareLinks: true,
  decisionRecords: true,
}).partial({
  activeVersionId: true,
  versions: true,
  notes: true,
  status: true,
});
