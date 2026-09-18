import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDefinition, parseLcov, validateDefinition } from '../scripts/contract-subject-coverage.mjs';

// integration_id: repository-contract-subject-execution
test('project execution definition resolves every declared contract subject', () => {
  // Arrange
  const subjectId = 'subject.ci.platform-matrix';
  // Act
  const definition = loadDefinition();
  const platform = definition.subjects.find((subject) => subject.subjectId === subjectId);
  const composite = definition.subjects.find((subject) => subject.subjectId === 'subject.ci.github-toolchain-verifier');
  // Assert
  assert.equal(definition.subjects.length, 18);
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
  assert.equal(composite.segments[1].coverage.enabled, false);
  assert.match(composite.segments[1].coverage.reason, /shell implementation/);
});

// target_id: parseLcov(string)
test('LCOV report is reduced to separate C0, C1, and line metrics', () => {
  // Arrange
  const lcov = [
    'SF:src/example.ts',
    'FNF:4',
    'FNH:3',
    'BRF:6',
    'BRH:5',
    'LF:10',
    'LH:8',
    'end_of_record',
  ].join('\n');
  // Act
  const result = parseLcov(lcov);
  // Assert
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

// integration_id: repository-contract-subject-execution
test('definition rejects an active segment without an execution test', () => {
  // Arrange
  const definition = loadDefinition();
  const invalid = structuredClone(definition);
  invalid.subjects[0].segments[0].tests = [];
  let failure;
  // Act
  try { validateDefinition(invalid); } catch (error) { failure = error; }
  // Assert
  assert.match(String(failure), /tests are required/);
});
