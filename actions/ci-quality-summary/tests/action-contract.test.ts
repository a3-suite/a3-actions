import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';

const testsDir = __dirname;
const root = path.resolve(testsDir, '..');

test('action.yml matches the checked-in public contract fixture', () => {
  const action = parse(fs.readFileSync(path.join(root, 'action.yml'), 'utf8')) as {
    name: string;
    inputs: Record<string, { required: boolean; default?: string }>;
    outputs: Record<string, unknown>;
    runs: { using: string };
  };
  const contract = JSON.parse(
    fs.readFileSync(path.join(testsDir, 'ci-quality-summary-contract.json'), 'utf8'),
  ) as {
    name: string;
    inputs: typeof action.inputs;
    outputs: string[];
    runtime: string;
  };

  assert.equal(action.name, contract.name);
  assert.deepEqual(action.inputs, contract.inputs);
  assert.deepEqual(Object.keys(action.outputs), contract.outputs);
  assert.equal(action.runs.using, contract.runtime);
});
