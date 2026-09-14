import { strict as assert } from 'node:assert';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathsReferToSameFile } from '../src/index.js';
import { resolveConfigSnapshot } from '../src/snapshot.js';

test('runtime overrides workflow and preset deterministically', () => {
  const result = resolveConfigSnapshot({
    preset: { RUST_VERSION: '1.91.1', CHANNEL: 'stable' },
    workflow: { CHANNEL: 'candidate', TARGET: 'linux-x64' },
    runtime: { TARGET: 'macos-arm64' },
  });
  assert.deepEqual({ ...result.values }, { RUST_VERSION: '1.91.1', CHANNEL: 'candidate', TARGET: 'macos-arm64' });
  assert.equal(result.digest, resolveConfigSnapshot({
    preset: { RUST_VERSION: '1.91.1', CHANNEL: 'stable' },
    workflow: { CHANNEL: 'candidate', TARGET: 'linux-x64' },
    runtime: { TARGET: 'macos-arm64' },
  }).digest);
});

test('rejects unsafe keys and values', () => {
  assert.throws(() => resolveConfigSnapshot({ runtime: { 'bad-key': 'x' } }), /config-snapshot-key-invalid/);
  assert.throws(() => resolveConfigSnapshot({ runtime: { TOKEN: 'line\nfeed' } }), /config-snapshot-runtime-value-invalid/);
});

test('detects command-file collisions before writing a snapshot', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'a3-config-snapshot-'));
  const snapshot = path.join(root, 'snapshot.json');
  assert.equal(pathsReferToSameFile(snapshot, snapshot), true);
  assert.equal(pathsReferToSameFile(snapshot, path.join(root, 'outputs')), false);
});
