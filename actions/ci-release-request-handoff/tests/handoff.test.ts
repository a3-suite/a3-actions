import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeReleaseRequestHandoff } from '../src/handoff.js';

const base = { tagSourceSha: 'a'.repeat(40), tagObjectSha: 'b'.repeat(40) };

// integration_id: ci-release-request-handoff-source
test('writes manual request and notes handoff files', () => {
  // Arrange
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-request-handoff-'));
  // Act
  const result = writeReleaseRequestHandoff({ ...base, mode: 'manual', outputDirectory, releaseVersion: '1.2.3', releaseTag: 'v1.2.3', releaseNotes: '# Release\n', approvalId: 'review-1', approvalBodySha256: 'c'.repeat(64), approvalExpiresAt: '2030-01-01T00:00:00Z', githubRef: 'refs/heads/main' });
  // Assert
  assert.equal(JSON.parse(fs.readFileSync(result.requestPath, 'utf8')).schema, 'ci.release-request.v1');
  assert.ok(result.releaseNotesPath && fs.existsSync(result.releaseNotesPath));
  assert.ok(fs.existsSync(result.requestDigestPath));
  fs.rmSync(outputDirectory, { recursive: true, force: true });
});

// integration_id: ci-release-request-handoff-source
test('writes tag request without release notes', () => {
  // Arrange
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-request-handoff-'));
  // Act
  const result = writeReleaseRequestHandoff({ ...base, mode: 'tag', outputDirectory, githubRef: 'refs/tags/v1.2.3', githubRefName: 'v1.2.3' });
  const request = JSON.parse(fs.readFileSync(result.requestPath, 'utf8'));
  // Assert
  assert.equal(request.event, 'tag');
  assert.equal(result.releaseNotesPath, undefined);
  fs.rmSync(outputDirectory, { recursive: true, force: true });
});
