import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoUntrackedDist, buildPlan, collectActions } from '../.github/scripts/check-action-dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('collects every Action with a bundled dist artifact', () => {
  const actions = collectActions(root);
  assert.equal(actions.length, 7);
  assert.ok(actions.every((action) => action.distPath.endsWith('/dist')));
});

test('build plan installs, rebuilds, and compares every Action dist', () => {
  const actions = [
    { name: 'first', path: '/workspace/actions/first', distPath: 'actions/first/dist' },
    { name: 'second', path: '/workspace/actions/second', distPath: 'actions/second/dist' },
  ];
  const plan = buildPlan('/workspace', actions);
  assert.deepEqual(plan, [
    { command: 'npm', args: ['ci', '--ignore-scripts'], cwd: '/workspace/actions/first' },
    { command: 'npm', args: ['run', 'build'], cwd: '/workspace/actions/first' },
    { command: 'npm', args: ['ci', '--ignore-scripts'], cwd: '/workspace/actions/second' },
    { command: 'npm', args: ['run', 'build'], cwd: '/workspace/actions/second' },
    { command: 'git', args: ['diff', '--exit-code', '--', 'actions/first/dist', 'actions/second/dist'], cwd: '/workspace' },
  ]);
});

test('fails when a build leaves an untracked dist file', () => {
  const actions = [{ distPath: 'actions/first/dist' }];
  const execute = () => 'actions/first/dist/extra.js\n';
  assert.throws(() => assertNoUntrackedDist('/workspace', actions, execute), /Untracked Action dist files/);
});
