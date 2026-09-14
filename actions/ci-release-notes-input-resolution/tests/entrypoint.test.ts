import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(__dirname, '..');

test('bundled entrypoint resolves an external tag handoff', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-notes-entrypoint-'));
  const request = path.join(tempRoot, 'request.json');
  const source = path.join(tempRoot, 'source');
  const output = path.join(tempRoot, 'output');
  const outputFile = path.join(tempRoot, 'outputs');
  fs.mkdirSync(source);
  fs.writeFileSync(request, JSON.stringify({ event: 'tag' }));
  fs.writeFileSync(path.join(source, 'release-notes.json'), '{}');
  fs.writeFileSync(path.join(source, 'release-notes-approval.json'), '{}');
  fs.writeFileSync(outputFile, '', 'utf8');
  const env = { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_OUTPUT: outputFile, 'INPUT_REQUEST-JSON': request, 'INPUT_INPUT-HANDOFF-DIRECTORY': source, 'INPUT_OUTPUT-DIRECTORY': output, 'INPUT_HANDOFF-RUN-ID': '42' } as Record<string, string>;
  const result = spawnSync(process.execPath, [path.join(root, 'dist/index.js')], { cwd: root, env, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(path.join(output, 'release-notes.json')));
  fs.rmSync(tempRoot, { recursive: true, force: true });
});
