import { strict as assert } from 'node:assert';
import test from 'node:test';
import { normalizeDigest, verifyProviderArtifact } from '../src/identity.js';

const digest = 'a'.repeat(64);
const expected = { runId: '123', name: 'bundle', id: '42', digest };

test('normalizes and verifies the provider identity', () => {
  assert.equal(normalizeDigest(digest), `sha256:${digest}`);
  assert.deepEqual(verifyProviderArtifact(expected, {
    workflow_run: { id: 123 }, name: 'bundle', id: 42, digest: `sha256:${digest}`,
  }), { ...expected, digest: `sha256:${digest}` });
});

test('rejects mismatched and malformed identity', () => {
  assert.throws(() => verifyProviderArtifact(expected, {
    workflow_run: { id: 123 }, name: 'other', id: 42, digest,
  }), /provider-name-mismatch/);
  assert.throws(() => normalizeDigest('sha256:bad'), /digest-invalid/);
});
