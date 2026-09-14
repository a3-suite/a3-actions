import { strict as assert } from 'node:assert';
import test from 'node:test';
import { classifyPaths, createDocsOnlyMatcher, detectChangeScope, determineBaseSha, isCommitSha, runGitDiff } from '../src/scope.js';

test('classifies docs and source changes', () => {
  const matcher = createDocsOnlyMatcher(['docs/**', 'README.md', '**/*.md']);
  assert.deepEqual(classifyPaths(['README.md', 'docs/guide.md', 'src/app.ts'], matcher), {
    docsFiles: ['README.md', 'docs/guide.md'],
    otherFiles: ['src/app.ts'],
  });
  assert.equal(determineBaseSha('', 'pull_request', 'base', 'before'), 'base');
  assert.deepEqual(detectChangeScope('base', 'head', matcher, () => 'README.md\nsrc/app.ts\n'), {
    runCi: true,
    runDocs: true,
    files: ['README.md', 'src/app.ts'],
    docsFiles: ['README.md'],
    otherFiles: ['src/app.ts'],
    status: 'success',
  });
});

test('fails open with unresolved status when the range is unavailable', () => {
  const result = detectChangeScope('', '', createDocsOnlyMatcher(['**/*.md']), () => '');
  assert.equal(result.status, 'unresolved');
  assert.equal(result.runCi, true);
  assert.equal(result.runDocs, true);
});

test('accepts only full commit SHAs before invoking git', () => {
  assert.equal(isCommitSha('a'.repeat(40)), true);
  assert.equal(isCommitSha('--relative=src'), false);
  assert.throws(() => runGitDiff('--relative=src', 'b'.repeat(40)), /change-scope-sha-invalid/);
});
