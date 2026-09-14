import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';

// contract_id: contract.ci-change-scope.outputs
// integration_id: ci-change-scope-contract-entrypoint

const root = path.resolve(__dirname, '..');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const runBundled = (base: string) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-change-scope-'));
  const output = path.join(tempRoot, 'outputs');
  fs.writeFileSync(output, '', 'utf8');
  const env = { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_OUTPUT: output } as Record<string, string>;
  env['INPUT_BASE-SHA'] = base;
  env['INPUT_HEAD-SHA'] = head;
  env['INPUT_DOCS-ONLY-PATTERNS'] = 'docs/**,README.md,**/*.md';
  const result = spawnSync(process.execPath, [path.join(root, 'dist/index.js')], { cwd: root, env, encoding: 'utf8' });
  return { output, result, tempRoot };
};

test('bundled entrypoint reports a valid range', () => {
  const run = runBundled(head);
  assert.equal(run.result.status, 0);
  assert.match(fs.readFileSync(run.output, 'utf8'), /status<</);
  assert.match(fs.readFileSync(run.output, 'utf8'), /success/);
  fs.rmSync(run.tempRoot, { recursive: true, force: true });
});

test('bundled entrypoint fails open for an invalid SHA', () => {
  const run = runBundled('--relative=src');
  assert.equal(run.result.status, 0);
  const output = fs.readFileSync(run.output, 'utf8');
  assert.match(output, /unresolved/);
  assert.match(output, /run-ci/);
  fs.rmSync(run.tempRoot, { recursive: true, force: true });
});
