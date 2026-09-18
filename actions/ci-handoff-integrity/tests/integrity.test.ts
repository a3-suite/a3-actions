import { strict as assert } from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateHandoffIntegrity } from '../src/integrity.js';

// integration_id: ci-handoff-integrity-source
test('validates descriptor, manifest, and artifact digest', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'a3-handoff-'));
  const artifact = 'payload';
  fs.writeFileSync(path.join(root, 'artifact.bin'), artifact);
  const digest = crypto.createHash('sha256').update(artifact).digest('hex');
  const manifest = JSON.stringify([{ path: 'artifact.bin', sha256: digest }]);
  fs.writeFileSync(path.join(root, 'manifest.json'), manifest);
  fs.writeFileSync(path.join(root, 'handoff.json'), JSON.stringify({ schema: 'ci.handoff.v1', source_sha: 'abc', version: '1.0.0', target_identity: 'linux', manifest: 'manifest.json' }));
  // Act
  const result = validateHandoffIntegrity(root, 'handoff.json', { sourceSha: 'abc', version: '1.0.0', targetIdentity: 'linux' });
  // Assert
  assert.equal(result.entries, 1);
  assert.equal(result.manifest, 'manifest.json');
});

// integration_id: ci-handoff-integrity-source
test('rejects traversal descriptors', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'a3-handoff-'));
  let failure: unknown;
  // Act
  try { validateHandoffIntegrity(root, '../handoff.json', { sourceSha: 'x', version: '1', targetIdentity: 'x' }); } catch (error) { failure = error; }
  // Assert
  assert.match(String(failure), /handoff-descriptor-traversal-rejected/);
});
