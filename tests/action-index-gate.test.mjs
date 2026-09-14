import test from 'node:test';
import assert from 'node:assert/strict';
import { updateActionTable } from '../.github/scripts/update-action-index.mjs';

const readme = `# project

## Action一覧

| Action | 用途 | 概要 |
| --- | --- | --- |
| [\`alpha\`](actions/alpha/README.md) | alpha を使うとき | alpha summary |

説明。
`;

test('preserves curated rows and appends newly discovered actions', () => {
  const updated = updateActionTable(readme, [
    { name: 'alpha', directory: 'alpha', description: 'alpha', readmeSummary: 'alpha' },
    { name: 'beta', directory: 'beta', description: 'beta description', readmeSummary: 'beta summary' },
  ]);

  assert.match(updated, /alpha.*alpha を使うとき.*alpha summary/);
  assert.match(updated, /beta.*beta summary.*beta description/);
  assert.match(updated, /action-catalog:start/);
  assert.match(updated, /action-catalog:end/);
  assert.match(updated, /action-catalog:start -->\n\n\| Action/);
  assert.match(updated, /beta description \|\n\n<!-- action-catalog:end -->/);
});

test('removes rows for deleted actions', () => {
  const updated = updateActionTable(readme, [
    { name: 'alpha', directory: 'alpha', description: 'alpha', readmeSummary: 'alpha' },
  ]);
  assert.doesNotMatch(updated, /beta/);
});
