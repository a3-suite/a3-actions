import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'verify-github-toolchain.sh');

const withToolchain = (callback) => {
  const bin = mkdtempSync(path.join(os.tmpdir(), 'a3-actions-toolchain-'));
  const commands = {
    gh: "#!/usr/bin/env bash\necho 'gh version 2.80.0 (test)'\n",
    jq: "#!/usr/bin/env bash\necho 'jq-1.7'\n",
    sha256sum: "#!/usr/bin/env bash\necho 'sha256sum (GNU coreutils) 9.5'\n",
  };
  try {
    for (const [name, content] of Object.entries(commands)) {
      const commandPath = path.join(bin, name);
      writeFileSync(commandPath, content);
      chmodSync(commandPath, 0o755);
    }
    for (const [name, target] of [
      ['awk', '/usr/bin/awk'],
      ['bash', '/bin/bash'],
      ['env', '/usr/bin/env'],
      ['sed', '/usr/bin/sed'],
    ]) {
      symlinkSync(target, path.join(bin, name));
    }
    callback(bin);
  } finally {
    rmSync(bin, { recursive: true, force: true });
  }
};

const run = (bin, mode, overrides = {}) => spawnSync('/bin/bash', [script, mode], {
  encoding: 'utf8',
  env: {
    ...process.env,
    PATH: bin,
    CI_GH_VERSION: '2.80.0',
    CI_JQ_VERSION: '1.7',
    CI_SHA256SUM_VERSION: '9.5',
    ...overrides,
  },
});

test('accepts every supported verification mode', () => withToolchain((bin) => {
  for (const mode of ['jq', 'gh-jq', 'jq-sha256', 'gh-jq-sha256']) {
    assert.equal(run(bin, mode).status, 0, mode);
  }
}));

test('rejects an unsupported mode', () => withToolchain((bin) => {
  const result = run(bin, 'all');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /github-toolchain-mode-invalid/);
}));

test('rejects an unavailable selected command', () => {
  for (const [mode, command, diagnostic] of [
    ['jq', 'jq', 'jq-required'],
    ['gh-jq', 'gh', 'github-cli-required'],
    ['jq-sha256', 'sha256sum', 'sha256sum-required'],
  ]) {
    withToolchain((bin) => {
      rmSync(path.join(bin, command));
      const result = run(bin, mode);
      assert.equal(result.status, 1, `${mode} should reject a missing ${command}`);
      assert.match(result.stderr, new RegExp(diagnostic));
    });
  }
});

test('requires an exact version for every selected command', () => withToolchain((bin) => {
  const missing = run(bin, 'gh-jq', { CI_GH_VERSION: '' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /gh-version-required/);

  const mismatch = run(bin, 'jq-sha256', { CI_JQ_VERSION: '1.6' });
  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stderr, /jq-version-mismatch: expected=1.6 actual=1.7/);
}));
