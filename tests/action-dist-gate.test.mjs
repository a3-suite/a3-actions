import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertNoUntrackedDist,
  assertTrackedReferences,
  buildPlan,
  collectActions,
  collectScriptBundles,
} from '../.github/scripts/check-action-dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('collects bundled and composite Actions with their distribution contract', () => {
  const actions = collectActions(root);
  assert.equal(actions.length, 14);
  assert.equal(actions.filter((action) => action.distPath).length, 11);
  assert.deepEqual(
    actions.filter((action) => action.runtime === 'composite').map((action) => action.name),
    ['ci-github-toolchain-verifier', 'ci-rust-release-build', 'ci-rust-source-gate'],
  );
  assert.deepEqual(Object.fromEntries(
    actions
      .filter((action) => action.runtime === 'composite')
      .map((action) => [action.name, action.referencedPaths]),
  ), {
    'ci-github-toolchain-verifier': ['scripts/ci-github/verify-github-toolchain.sh'],
    'ci-rust-release-build': ['scripts/rust-release/ci-release-build.sh'],
    'ci-rust-source-gate': ['scripts/rust-release/ci-source-gate.sh'],
  });
});

test('build plan installs, rebuilds, and compares every Action dist', () => {
  const actions = [
    { name: 'first', path: '/workspace/actions/first', distPath: 'actions/first/dist' },
    { name: 'second', path: '/workspace/actions/second', distPath: null },
  ];
  const plan = buildPlan('/workspace', actions);
  assert.deepEqual(plan, [
    { command: 'npm', args: ['ci', '--ignore-scripts'], cwd: '/workspace/actions/first' },
    { command: 'npm', args: ['run', 'build'], cwd: '/workspace/actions/first' },
    { command: 'git', args: ['diff', '--exit-code', '--', 'actions/first/dist'], cwd: '/workspace' },
  ]);
});

test('collects and rebuilds the Rust release script bundle', () => {
  const bundles = collectScriptBundles(root);
  assert.deepEqual(bundles.map((bundle) => bundle.name), ['rust-release-platform-manifest']);
  assert.deepEqual(bundles.map((bundle) => bundle.distPath), ['scripts/rust-release/dist']);

  const plan = buildPlan('/workspace', [], [{
    name: 'rust-release-platform-manifest',
    path: '/workspace/scripts/rust-release',
    distPath: 'scripts/rust-release/dist',
  }]);
  assert.deepEqual(plan, [
    { command: 'npm', args: ['ci', '--ignore-scripts'], cwd: '/workspace/scripts/rust-release' },
    { command: 'npm', args: ['run', 'build'], cwd: '/workspace/scripts/rust-release' },
    { command: 'git', args: ['diff', '--exit-code', '--', 'scripts/rust-release/dist'], cwd: '/workspace' },
  ]);
});

test('fails when a build leaves an untracked dist file', () => {
  const actions = [{ distPath: 'actions/first/dist' }];
  const execute = () => 'actions/first/dist/extra.js\n';
  assert.throws(() => assertNoUntrackedDist('/workspace', actions, [], execute), /Untracked distribution files/);
});

test('fails when a Composite Action references an untracked script', () => {
  const actions = [{ referencedPaths: ['scripts/example/run.sh'] }];
  const execute = (command, args) => {
    assert.equal(command, 'git');
    assert.deepEqual(args, ['ls-files', '--error-unmatch', '--', 'scripts/example/run.sh']);
    throw new Error('pathspec did not match any files');
  };

  assert.throws(
    () => assertTrackedReferences('/workspace', actions, execute),
    /untracked referenced paths.*scripts\/example\/run\.sh/is,
  );
});
