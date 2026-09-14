import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';

test('action.yml exposes the handoff integrity contract', () => {
  const root = path.resolve(__dirname, '..');
  const action = parse(fs.readFileSync(path.join(root, 'action.yml'), 'utf8')) as any;
  assert.equal(action.name, 'ci-handoff-integrity');
  assert.deepEqual(Object.keys(action.outputs), ['status', 'descriptor', 'manifest', 'manifest-digest', 'entries']);
  assert.equal(action.runs.using, 'node20');
});
