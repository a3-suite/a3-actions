import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';

test('action.yml exposes the publish version contract', () => {
  const root = path.resolve(__dirname, '..');
  const action = parse(fs.readFileSync(path.join(root, 'action.yml'), 'utf8')) as any;
  assert.equal(action.name, 'ci-publish-version');
  assert.deepEqual(Object.keys(action.inputs), ['version-plan-json']);
  assert.deepEqual(Object.keys(action.outputs), ['status', 'publish-version']);
  assert.equal(action.runs.using, 'node20');
});
