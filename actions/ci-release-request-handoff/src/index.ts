import * as core from '@actions/core';
import { writeReleaseRequestHandoff } from './handoff.js';

export const run = (): void => {
  try {
    const result = writeReleaseRequestHandoff({
      mode: core.getInput('mode', { required: true }) as 'manual' | 'tag',
      outputDirectory: core.getInput('output-directory', { required: true }),
      releaseVersion: core.getInput('release-version'),
      releaseTag: core.getInput('release-tag'),
      releaseNotes: core.getInput('release-notes'),
      approvalId: core.getInput('approval-id'),
      approvalBodySha256: core.getInput('approval-body-sha256'),
      approvalExpiresAt: core.getInput('approval-expires-at'),
      tagSourceSha: core.getInput('tag-source-sha', { required: true }),
      tagObjectSha: core.getInput('tag-object-sha', { required: true }),
      githubRef: core.getInput('github-ref'),
      githubRefName: core.getInput('github-ref-name'),
      requestRunId: core.getInput('request-run-id'),
      requestActor: core.getInput('request-actor'),
    });
    core.setOutput('request-path', result.requestPath);
    core.setOutput('release-notes-path', result.releaseNotesPath ?? '');
    core.setOutput('approval-path', result.approvalPath ?? '');
    core.setOutput('request-digest', result.requestDigestPath);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
};

if (process.env.GITHUB_ACTIONS === 'true') run();
