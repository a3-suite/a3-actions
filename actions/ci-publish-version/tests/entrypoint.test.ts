import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(__dirname, '..');

const runBundled = (plan: unknown) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-publish-version-'));
  const planPath = path.join(tempRoot, 'version-plan.json');
  const outputPath = path.join(tempRoot, 'outputs');
  fs.writeFileSync(planPath, JSON.stringify(plan));
  fs.writeFileSync(outputPath, '', 'utf8');
  const env = {
    ...process.env,
    GITHUB_ACTIONS: 'true',
    GITHUB_OUTPUT: outputPath,
    'INPUT_VERSION-PLAN-JSON': planPath,
  } as Record<string, string>;
  const result = spawnSync(process.execPath, [path.join(root, 'dist/index.js')], { cwd: root, env, encoding: 'utf8' });
  const output = fs.readFileSync(outputPath, 'utf8');
  fs.rmSync(tempRoot, { recursive: true, force: true });
  return { result, output };
};

test('bundled entrypoint publishes a materialized version', () => {
  const run = runBundled({ strategy: 'ciGenerated', template: '{baseVersion}-dev.{build}', components: { baseVersion: '1.2.3', build: '42' } });
  assert.equal(run.result.status, 0);
  assert.match(run.output, /status<<.*success/s);
  assert.match(run.output, /publish-version<<.*1\.2\.3-dev\.42/s);
});

test('bundled entrypoint publishes an exact version', () => {
  const run = runBundled({ strategy: 'exact', publishVersion: '1.2.3' });
  assert.equal(run.result.status, 0);
  assert.match(run.output, /status<<.*success/s);
  assert.match(run.output, /publish-version<<.*1\.2\.3/s);
});

test('bundled entrypoint fails invalid plan input', () => {
  const run = runBundled({ strategy: 'ciGenerated', template: '{baseVersion}', components: {} });
  assert.notEqual(run.result.status, 0);
  assert.match(run.output, /status<<.*failed/s);
});
