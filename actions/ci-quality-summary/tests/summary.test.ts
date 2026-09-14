import { strict as assert } from 'node:assert';
import test from 'node:test';
import { renderQualitySummary } from '../src/summary.js';

const row = (result: string, reason?: string) => ({
  unit: 'unit',
  execution: 'test command',
  result,
  evidence: 'evidence.log',
  collection: result === 'success' ? '完了' : '一部取得',
  ...(reason ? { reason } : {}),
});

test('renders success and a stable digest', () => {
  const first = renderQualitySummary({ jobs: [row('success')] });
  const second = renderQualitySummary({ jobs: [row('success')] });
  assert.equal(first.status, 'success');
  assert.match(first.markdown, /ジョブサマリ/);
  assert.equal(first.digest, second.digest);
  assert.match(first.digest, /^sha256:[0-9a-f]{64}$/);
});

test('preserves failure states with deterministic precedence', () => {
  assert.equal(renderQualitySummary({ jobs: [{ ...row('blocked', 'blocked'), collection: '完了' }] }).status, 'blocked');
  assert.equal(renderQualitySummary({ jobs: [row('判定不能', 'unknown')] }).status, 'unresolved');
  assert.equal(renderQualitySummary({ jobs: [row('failed', 'failed'), row('blocked', 'blocked')] }).status, 'failed');
  assert.equal(renderQualitySummary({ jobs: [{ ...row('未実施', 'not run'), collection: '完了' }] }).status, 'blocked');
  assert.equal(renderQualitySummary({ jobs: [{ ...row('success'), collection: '取得不可' }] }).status, 'unresolved');
});

test('rejects missing rows and reasons', () => {
  assert.throws(() => renderQualitySummary({}), /ci-summary-rows-invalid/);
  assert.throws(() => renderQualitySummary({ jobs: [row('failed')] }), /ci-summary-reason-required/);
});
