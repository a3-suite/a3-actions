import { strict as assert } from 'node:assert';
import test from 'node:test';
import { parseFutureRfc3339 } from '../src/control.js';

// target_id: parseFutureRfc3339(string)
test('rejects expired approval timestamps', () => {
  // Arrange
  let failure: unknown;

  // Act
  try {
    parseFutureRfc3339('2000-01-01T00:00:00Z');
  } catch (error) {
    failure = error;
  }

  // Assert
  assert.match(String(failure), /expired/);
});
