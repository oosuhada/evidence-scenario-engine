import { beforeEach, describe, expect, it } from 'vitest';
import { createSampleDecision } from '../decision-model/factories';
import { LocalDecisionRepository } from './local-repository';

describe('local decision persistence', () => {
  beforeEach(() => localStorage.clear());

  it('persists a decision and restores it after a new repository instance', async () => {
    const decision = createSampleDecision();
    const repository = new LocalDecisionRepository();
    await repository.save(decision);

    const restored = await new LocalDecisionRepository().get(decision.id);
    expect(restored?.title).toBe(decision.title);
    expect(restored?.activeVersionId).toBe(decision.activeVersionId);
  });

  it('creates and revokes a read-only share snapshot', async () => {
    const decision = createSampleDecision();
    const repository = new LocalDecisionRepository();
    await repository.createShare(decision, 'share-test');
    expect((await repository.getShared('share-test'))?.id).toBe(decision.id);
    await repository.revokeShare('share-test');
    expect(await repository.getShared('share-test')).toBeNull();
  });
});
