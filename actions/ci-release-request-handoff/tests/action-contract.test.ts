import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';

const root = path.resolve(__dirname, '..');

test('action.yml matches the checked-in public contract fixture', () => {
  const action = parse(fs.readFileSync(path.join(root, 'action.yml'), 'utf8')) as any;
  const contract = JSON.parse(fs.readFileSync(path.join(__dirname, 'ci-release-request-handoff-contract.json'), 'utf8')) as any;
  assert.equal(action.name, contract.name);
  assert.deepEqual(action.inputs, contract.inputs);
  assert.deepEqual(Object.keys(action.outputs), contract.outputs);
  assert.equal(action.runs.using, contract.runtime);
});
