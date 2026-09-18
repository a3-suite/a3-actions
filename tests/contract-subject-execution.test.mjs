import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDefinition, parseLcov, validateDefinition } from '../scripts/contract-subject-coverage.mjs';

test('project execution definition resolves every declared contract subject', () => {
  const definition = loadDefinition();
  assert.equal(definition.subjects.length, 15);
  const platform = definition.subjects.find((subject) => subject.subjectId === 'subject.ci.platform-matrix');
  assert.deepEqual(
    platform.segments.map((segment) => [segment.id, segment.level, segment.status ?? 'active']),
    [
      ['unit-source', 'unit', 'active'],
      ['integration-bundle', 'integration', 'active'],
      ['e2e', 'e2e', 'excluded'],
    ],
  );
  assert.deepEqual(platform.segments[0].coverage.include, ['src/**/*.ts']);
  assert.deepEqual(platform.segments[1].coverage.include, ['dist/**/*.js']);
  assert.equal(definition.report.unit, 'contract-subject-and-execution-segment');
  const composite = definition.subjects.find((subject) => subject.subjectId === 'subject.ci.github-toolchain-verifier');
  assert.equal(composite.segments[1].coverage.enabled, false);
  assert.match(composite.segments[1].coverage.reason, /shell implementation/);
});

test('LCOV report is reduced to separate C0, C1, and line metrics', () => {
  const result = parseLcov([
    'SF:src/example.ts',
    'FNF:4',
    'FNH:3',
    'BRF:6',
    'BRH:5',
    'LF:10',
    'LH:8',
    'end_of_record',
  ].join('\n'));
  assert.deepEqual(result.metrics, {
    C0: {
      covered: null,
      total: null,
      percentage: null,
      acquisitionStatus: 'unavailable',
      unavailableReason: 'Node LCOV exposes function counts, not statement counts; line coverage is not substituted for C0.',
    },
    C1: { covered: 5, total: 6, percentage: 83.33, acquisitionStatus: 'available', unavailableReason: null },
    line: { covered: 8, total: 10, percentage: 80, acquisitionStatus: 'available', unavailableReason: null },
  });
});

test('definition rejects an active segment without an execution test', () => {
  const definition = loadDefinition();
  const invalid = structuredClone(definition);
  invalid.subjects[0].segments[0].tests = [];
  assert.throws(() => validateDefinition(invalid), /tests are required/);
});
