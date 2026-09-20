import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { executeAdapter, loadAdapterBundle } from '../src/adapter.js';

const descriptor = `schemaVersion: "1"\nkind: ci-adapter-bundle\nid: node-quality\ncontract: quality-scripts\nlanguageProfiles: [node]\nprovider: github\nexecutionBoundary: read-only\nsourceCheckout: fixed-source\ncopyable: true\nowner: ci\nassets:\n  - id: config\n    destination: .ci/config.yml\nprojectSettings:\n  requiredFiles: []\n  requiredScripts: []\n  requiredEnvironmentPaths: []\ntoolchain:\n  versionEnv: CI_TOOLCHAIN_VERSION\n  verify:\n    command: node\n    args: [--version]\n    expectedOutput: "^v\${CI_TOOLCHAIN_VERSION}$"\npreparation:\n  - id: prepare\n    command: node\n    args: [-e, "process.exit(0)"]\ncommands:\n  - id: test\n    command: node\n    args: [-e, "process.exit(0)"]\n`;

// integration_id: ci-quality-adapter-source
test('executes a read-only adapter in the source root', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-'));
  const bundlePath = path.join(root, 'adapter.yml');
  fs.writeFileSync(bundlePath, descriptor);

  // Act
  const result = executeAdapter(loadAdapterBundle(bundlePath), { sourceRoot: root, toolchainVersion: process.version.slice(1), requireTrustedProjectScripts: false });

  // Assert
  assert.equal(result.status, 'success');
  assert.deepEqual(result.results.map((item) => item.id), ['toolchain-verify', 'prepare', 'test']);
  fs.rmSync(root, { recursive: true, force: true });
});

// integration_id: ci-quality-adapter-source
test('accepts a quality descriptor without copied assets', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-no-assets-'));
  const bundlePath = path.join(root, 'adapter.yml');
  const descriptorWithoutAssets = descriptor.replace(
    'assets:\n  - id: config\n    destination: .ci/config.yml',
    'assets: []',
  );
  fs.writeFileSync(bundlePath, descriptorWithoutAssets);

  // Act
  const result = executeAdapter(loadAdapterBundle(bundlePath), { sourceRoot: root, toolchainVersion: process.version.slice(1), requireTrustedProjectScripts: false });

  // Assert
  assert.equal(result.status, 'success');
  fs.rmSync(root, { recursive: true, force: true });
});

// integration_id: ci-quality-adapter-source
test('rejects a non-array asset declaration', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-invalid-assets-'));
  const bundlePath = path.join(root, 'adapter.yml');
  fs.writeFileSync(bundlePath, descriptor.replace(
    'assets:\n  - id: config\n    destination: .ci/config.yml',
    'assets: invalid',
  ));

  // Act / Assert
  assert.throws(() => loadAdapterBundle(bundlePath), /quality-adapter-assets-invalid/);
  fs.rmSync(root, { recursive: true, force: true });
});

// integration_id: ci-quality-adapter-source
test('rejects a trusted script mismatch', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-'));
  const trusted = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-trusted-'));
  const bundlePath = path.join(root, 'adapter.yml');
  fs.writeFileSync(bundlePath, descriptor.replace('requiredScripts: []', 'requiredScripts: [test]'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node a.js' } }));
  fs.writeFileSync(path.join(trusted, 'package.json'), JSON.stringify({ scripts: { test: 'node b.js' } }));
  let failure: unknown;

  // Act
  try {
    executeAdapter(loadAdapterBundle(bundlePath), { sourceRoot: root, toolchainVersion: process.version.slice(1), requireTrustedProjectScripts: true, trustedProjectRoot: trusted });
  } catch (error) {
    failure = error;
  }

  // Assert
  assert.match(String(failure), /script-binding-mismatch/);
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(trusted, { recursive: true, force: true });
});

// integration_id: ci-quality-adapter-source
test('allows matching multiline scripts outside the required script set', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-scripts-'));
  const trusted = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-trusted-'));
  const bundlePath = path.join(root, 'adapter.yml');
  fs.writeFileSync(bundlePath, descriptor.replace('requiredScripts: []', 'requiredScripts: [test]'));
  const packageJson = JSON.stringify({ scripts: { test: 'node test.js', release: 'echo a\necho b' } });
  fs.writeFileSync(path.join(root, 'package.json'), packageJson);
  fs.writeFileSync(path.join(trusted, 'package.json'), packageJson);

  // Act
  const result = executeAdapter(loadAdapterBundle(bundlePath), { sourceRoot: root, toolchainVersion: process.version.slice(1), requireTrustedProjectScripts: true, trustedProjectRoot: trusted });

  // Assert
  assert.equal(result.status, 'success');
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(trusted, { recursive: true, force: true });
});

// integration_id: ci-quality-adapter-source
test('reports a toolchain mismatch without running project commands', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-toolchain-'));
  const bundlePath = path.join(root, 'adapter.yml');
  fs.writeFileSync(bundlePath, descriptor);

  // Act
  const result = executeAdapter(loadAdapterBundle(bundlePath), { sourceRoot: root, toolchainVersion: '0.0.0', requireTrustedProjectScripts: false });

  // Assert
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.results.map((item) => item.id), ['toolchain-verify']);
  fs.rmSync(root, { recursive: true, force: true });
});

// integration_id: ci-quality-adapter-source
test('runs commands from the fixed source root', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-cwd-'));
  const bundlePath = path.join(root, 'adapter.yml');
  fs.writeFileSync(bundlePath, descriptor.replace('process.exit(0)', "process.stdout.write(process.cwd())"));

  // Act
  const result = executeAdapter(loadAdapterBundle(bundlePath), { sourceRoot: root, toolchainVersion: process.version.slice(1), requireTrustedProjectScripts: false });

  // Assert
  assert.equal(result.results[1].stdout, fs.realpathSync(root));
  fs.rmSync(root, { recursive: true, force: true });
});

// integration_id: ci-quality-adapter-source
test('rejects invalid adapter contract inputs', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-invalid-contract-'));
  const cases = [
    ['metadata', descriptor.replace('schemaVersion: "1"', 'schemaVersion: "2"'), /metadata-invalid/],
    ['structure', descriptor.replace('projectSettings:', 'projectSettingsMissing:'), /structure-invalid/],
    ['execution boundary', descriptor.replace('executionBoundary: read-only', 'executionBoundary: write'), /execution-boundary-invalid/],
    ['source checkout', descriptor.replace('sourceCheckout: fixed-source', 'sourceCheckout: moving'), /source-checkout-invalid/],
    ['copyable', descriptor.replace('copyable: true', 'copyable: yes'), /copyable-invalid/],
    ['toolchain variable', descriptor.replace('versionEnv: CI_TOOLCHAIN_VERSION', 'versionEnv: OTHER_VERSION'), /toolchain-invalid/],
    ['toolchain binding', descriptor.replace(/expectedOutput: .+/, 'expectedOutput: "^v1$"'), /toolchain-binding-invalid/],
    ['asset source', descriptor.replace('destination: .ci/config.yml', 'source: config.yml\n    destination: .ci/config.yml'), /asset-invalid/],
    ['asset destination', descriptor.replace('destination: .ci/config.yml', 'destination: config.yml'), /asset-destination-invalid/],
    ['source command', descriptor.replace(/command: node\n    args: \[--version\]\n    expectedOutput/, 'command: skills/node/bin/node\n    args: [--version]\n    expectedOutput'), /command-source-reference/],
  ] as const;
  const failures: unknown[] = [];

  // Act
  for (const [name, content] of cases) {
    const bundlePath = path.join(root, `${name.replaceAll(' ', '-')}.yml`);
    fs.writeFileSync(bundlePath, content);
    try { loadAdapterBundle(bundlePath); } catch (error) { failures.push(error); }
  }

  // Assert
  assert.equal(failures.length, cases.length);
  failures.forEach((failure, index) => assert.match(String(failure), cases[index][2]));
  fs.rmSync(root, { recursive: true, force: true });
});

// integration_id: ci-quality-adapter-source
test('rejects invalid adapter execution inputs', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-adapter-invalid-execution-'));
  const bundlePath = path.join(root, 'adapter.yml');
  fs.writeFileSync(bundlePath, descriptor);
  const bundle = loadAdapterBundle(bundlePath);
  const cases = [
    [{ sourceRoot: root, toolchainVersion: '', requireTrustedProjectScripts: false }, /toolchain-version-missing/],
    [{ sourceRoot: root, toolchainVersion: process.version.slice(1), languageProfile: 'rust', requireTrustedProjectScripts: false }, /language-profile-mismatch/],
  ] as const;
  const failures: unknown[] = [];

  // Act
  for (const [options] of cases) {
    try { executeAdapter(bundle, options); } catch (error) { failures.push(error); }
  }

  // Assert
  assert.equal(failures.length, cases.length);
  failures.forEach((failure, index) => assert.match(String(failure), cases[index][1]));
  fs.rmSync(root, { recursive: true, force: true });
});
