import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(__dirname, '..');

test('bundled entrypoint writes a manual handoff', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-request-entrypoint-'));
  const output = path.join(tempRoot, 'outputs');
  const handoff = path.join(tempRoot, 'handoff');
  fs.writeFileSync(output, '', 'utf8');
  const env = { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_OUTPUT: output, 'INPUT_MODE': 'manual', 'INPUT_OUTPUT-DIRECTORY': handoff, 'INPUT_TAG-SOURCE-SHA': 'a'.repeat(40), 'INPUT_TAG-OBJECT-SHA': 'b'.repeat(40), 'INPUT_RELEASE-VERSION': '1.2.3', 'INPUT_RELEASE-TAG': 'v1.2.3', 'INPUT_RELEASE-NOTES': '# Release\n', 'INPUT_APPROVAL-ID': 'review-1', 'INPUT_APPROVAL-BODY-SHA256': 'c'.repeat(64), 'INPUT_APPROVAL-EXPIRES-AT': '2030-01-01T00:00:00Z', 'INPUT_GITHUB-REF': 'refs/heads/main' } as Record<string, string>;
  const result = spawnSync(process.execPath, [path.join(root, 'dist/index.js')], { cwd: root, env, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(path.join(handoff, 'release-request.json')));
  fs.rmSync(tempRoot, { recursive: true, force: true });
});
