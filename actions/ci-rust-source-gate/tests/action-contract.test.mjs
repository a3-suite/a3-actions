import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  accessSync,
  chmodSync,
  constants,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const action = readFileSync(path.join(root, 'action.yml'), 'utf8');
const script = path.resolve(root, '../../scripts/rust-release/ci-source-gate.sh');

const runBlock = () => {
  const match = action.match(/^      run: \|\n((?: {8}.*\n?)+)/m);
  assert.ok(match, 'action.yml must contain a composite run block');
  return match[1].replace(/^ {8}/gm, '');
};

test('action.yml maps the public source gate inputs to the shared script', () => {
  assert.match(action, /^name: ci-rust-source-gate$/m);
  assert.match(action, /^  using: composite$/m);
  for (const input of ['language-profile', 'authority-path']) {
    assert.match(action, new RegExp(`^  ${input}:$`, 'm'));
  }
  assert.match(action, /scripts\/rust-release\/ci-source-gate\.sh/);
  assert.match(action, /^  verified:$/m);
  assert.match(action, /^    value: \$\{\{ steps\.verify\.outputs\.verified \}\}$/m);
  assert.match(action, /^        LANGUAGE_PROFILE: \$\{\{ inputs\.language-profile \}\}$/m);
  assert.match(action, /^        AUTHORITY_PATH: \$\{\{ inputs\.authority-path \}\}$/m);
  accessSync(script, constants.R_OK | constants.X_OK);
});

test('composite source gate exposes verified only after script success', () => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'a3-actions-rust-source-action-'));
  const actionPath = path.join(fixture, 'actions', 'ci-rust-source-gate');
  const fixtureScript = path.join(fixture, 'scripts', 'rust-release', 'ci-source-gate.sh');
  const output = path.join(fixture, 'github-output');
  try {
    mkdirSync(path.dirname(fixtureScript), { recursive: true });
    mkdirSync(actionPath, { recursive: true });
    writeFileSync(fixtureScript, '#!/usr/bin/env bash\nset -euo pipefail\ntest "$1" = rust\ntest "$2" = authority.json\n');
    chmodSync(fixtureScript, 0o755);
    writeFileSync(output, '');
    const success = spawnSync('bash', ['-euo', 'pipefail', '-c', runBlock()], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_ACTION_PATH: actionPath,
        GITHUB_OUTPUT: output,
        LANGUAGE_PROFILE: 'rust',
        AUTHORITY_PATH: 'authority.json',
      },
    });
    assert.equal(success.status, 0, success.stderr);
    assert.equal(readFileSync(output, 'utf8'), 'verified=true\n');

    writeFileSync(output, '');
    const failure = spawnSync('bash', ['-euo', 'pipefail', '-c', runBlock()], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_ACTION_PATH: actionPath,
        GITHUB_OUTPUT: output,
        LANGUAGE_PROFILE: 'python',
        AUTHORITY_PATH: 'authority.json',
      },
    });
    assert.notEqual(failure.status, 0);
    assert.equal(readFileSync(output, 'utf8'), '');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
