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

// target_id: renderQualitySummary(QualitySummaryInput)
test('renders success and a stable digest', () => {
  // Arrange
  const input = { jobs: [row('success')] };
  // Act
  const first = renderQualitySummary(input);
  const second = renderQualitySummary(input);
  // Assert
  assert.equal(first.status, 'success');
  assert.match(first.markdown, /ジョブサマリ/);
  assert.equal(first.digest, second.digest);
  assert.match(first.digest, /^sha256:[0-9a-f]{64}$/);
});

// target_id: renderQualitySummary(QualitySummaryInput)
test('preserves failure states with deterministic precedence', () => {
  // Arrange
  const inputs = [{ jobs: [{ ...row('blocked', 'blocked'), collection: '完了' }] }, { jobs: [row('判定不能', 'unknown')] }, { jobs: [row('failed', 'failed'), row('blocked', 'blocked')] }, { jobs: [{ ...row('未実施', 'not run'), collection: '完了' }] }, { jobs: [{ ...row('success'), collection: '取得不可' }] }];
  // Act
  const statuses = inputs.map((input) => renderQualitySummary(input).status);
  // Assert
  assert.deepEqual(statuses, ['blocked', 'unresolved', 'failed', 'blocked', 'unresolved']);
});

// target_id: renderQualitySummary(QualitySummaryInput)
test('rejects missing rows and reasons', () => {
  // Arrange
  const inputs = [{}, { jobs: [row('failed')] }];
  // Act
  const failures = inputs.map((input) => { try { renderQualitySummary(input); } catch (error) { return error; } return undefined; });
  // Assert
  assert.match(String(failures[0]), /ci-summary-rows-invalid/);
  assert.match(String(failures[1]), /ci-summary-reason-required/);
});
