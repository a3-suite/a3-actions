import { strict as assert } from 'node:assert';
import crypto from 'node:crypto';
import test from 'node:test';
import { validateReleaseNotesBinding } from '../src/binding.js';

test('binds approved release notes by identity and digest', () => {
  const body = '# Release v1.2.3\n';
  const digest = crypto.createHash('sha256').update(body).digest('hex');
  const handoff = { schema: 'ci.release-notes.v1', source_contract: 'git.release-flow', source_field: 'body', release_identity: 'v1.2.3', body, body_sha256: digest };
  const approval = { schema: 'ci.release-notes-approval.v1', source_contract: 'git.release-flow', source_field: 'body', release_identity: 'v1.2.3', body_sha256: digest, approval_id: 'review-1' };
  assert.deepEqual(validateReleaseNotesBinding(handoff, approval, 'v1.2.3'), { releaseIdentity: 'v1.2.3', bodyDigest: digest, approvalId: 'review-1' });
});

test('rejects a mismatched approval digest', () => {
  const handoff = { schema: 'ci.release-notes.v1', source_contract: 'git.release-flow', source_field: 'body', release_identity: 'v1.2.3', body: 'body', body_sha256: crypto.createHash('sha256').update('body').digest('hex') };
  const approval = { schema: 'ci.release-notes-approval.v1', source_contract: 'git.release-flow', source_field: 'body', release_identity: 'v1.2.3', body_sha256: 'a'.repeat(64), approval_id: 'review-1' };
  assert.throws(() => validateReleaseNotesBinding(handoff, approval, 'v1.2.3'), /release-notes-approval-mismatch/);
});
