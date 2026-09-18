import { strict as assert } from 'node:assert';
import test from 'node:test';
import { resolvePlatformMatrix } from '../src/matrix.js';

const validManifest = `platforms:
  - id: linux-x64
    runner: ubuntu-24.04
    target: x86_64-unknown-linux-gnu
  - id: macos-arm64
    runner: macos-14
    target: aarch64-apple-darwin
`;

test('resolves a deterministic include matrix', () => {
  assert.deepEqual(resolvePlatformMatrix(validManifest), {
    include: [
      { id: 'linux-x64', runner: 'ubuntu-24.04', target: 'x86_64-unknown-linux-gnu' },
      { id: 'macos-arm64', runner: 'macos-14', target: 'aarch64-apple-darwin' },
    ],
  });
});

test('rejects empty, extra, and malformed manifest structures', () => {
  assert.throws(() => resolvePlatformMatrix('platforms: []\n'), /platform-matrix-platforms-empty/);
  assert.throws(() => resolvePlatformMatrix('platforms: []\nextra: true\n'), /platform-matrix-root-invalid/);
  assert.throws(
    () => resolvePlatformMatrix('platforms:\n  - id: linux\n    runner: ubuntu-24.04\n'),
    /platform-matrix-platform-0-shape-invalid/,
  );
});

test('rejects duplicate identities, duplicate targets, and unsupported runners', () => {
  assert.throws(
    () => resolvePlatformMatrix(validManifest.replace('macos-arm64', 'linux-x64')),
    /platform-matrix-platform-1-id-invalid/,
  );
  assert.throws(
    () => resolvePlatformMatrix(validManifest.replace('aarch64-apple-darwin', 'x86_64-unknown-linux-gnu')),
    /platform-matrix-platform-1-target-invalid/,
  );
  assert.throws(
    () => resolvePlatformMatrix(validManifest.replace('macos-14', 'ubuntu-latest')),
    /platform-matrix-platform-1-runner-invalid/,
  );
});

test('rejects manifests beyond the bounded input size', () => {
  assert.throws(
    () => resolvePlatformMatrix(`platforms:\n${' '.repeat(64 * 1024)}`),
    /platform-matrix-manifest-too-large/,
  );
});
