import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveReleaseNotesInput } from '../src/resolution.js';

const setup = (event: string) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-notes-resolution-'));
  const request = path.join(root, 'request.json');
  const source = path.join(root, 'source');
  const output = path.join(root, 'output');
  fs.mkdirSync(source);
  fs.writeFileSync(request, JSON.stringify({ event }));
  return { root, request, source, output };
};

test('copies external notes for tag mode', () => {
  const paths = setup('tag');
  fs.writeFileSync(path.join(paths.source, 'release-notes.json'), '{}');
  fs.writeFileSync(path.join(paths.source, 'release-notes-approval.json'), '{}');
  const result = resolveReleaseNotesInput({ requestJson: paths.request, inputHandoffDirectory: paths.source, outputDirectory: paths.output, handoffRunId: '42', resolveOnly: false });
  assert.equal(result.requiresExternal, true);
  assert.ok(result.releaseNotesPath && fs.existsSync(result.releaseNotesPath));
  fs.rmSync(paths.root, { recursive: true, force: true });
});

test('reports manual mode without external handoff', () => {
  const paths = setup('workflow_dispatch');
  fs.mkdirSync(paths.output);
  fs.writeFileSync(path.join(paths.output, 'release-notes.json'), '{}');
  fs.writeFileSync(path.join(paths.output, 'release-notes-approval.json'), '{}');
  const result = resolveReleaseNotesInput({ requestJson: paths.request, inputHandoffDirectory: paths.source, outputDirectory: paths.output, resolveOnly: true });
  assert.equal(result.requiresExternal, false);
  fs.rmSync(paths.root, { recursive: true, force: true });
});
