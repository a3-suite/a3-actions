import { strict as assert } from 'node:assert';
import test from 'node:test';
import { summarizeVitest } from '../src/summary.js';
test('summarizes a complete report', () => {
  const result = summarizeVitest({ numTotalTests: 2, numPassedTests: 2, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, success: true }, 'unit', 'vitest.json');
  assert.equal(result.status, 'passed'); assert.equal(result.collection, 'complete'); assert.match(result.markdown, /2件/);
});
test('keeps malformed reports unresolved without failing the step', () => {
  const result = summarizeVitest(null, 'unit', 'missing.json');
  assert.equal(result.status, 'unresolved'); assert.equal(result.collection, 'unavailable');
  const malformedShape = summarizeVitest({ testResults: {} as never }, 'unit', 'malformed.json');
  assert.equal(malformedShape.status, 'unresolved'); assert.equal(malformedShape.collection, 'unavailable');
  const malformedElement = summarizeVitest({ testResults: [null, 'invalid'] as never }, 'unit', 'malformed-element.json');
  assert.equal(malformedElement.status, 'unresolved'); assert.equal(malformedElement.collection, 'partial');
});
