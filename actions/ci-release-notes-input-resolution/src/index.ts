import * as core from '@actions/core';
import { resolveReleaseNotesInput } from './resolution.js';

export const run = (): void => {
  try {
    const result = resolveReleaseNotesInput({
      requestJson: core.getInput('request-json', { required: true }),
      inputHandoffDirectory: core.getInput('input-handoff-directory', { required: true }),
      outputDirectory: core.getInput('output-directory', { required: true }),
      handoffRunId: core.getInput('handoff-run-id'),
      resolveOnly: core.getInput('resolve-only') === 'true',
    });
    core.setOutput('status', result.status);
    core.setOutput('requires-external', String(result.requiresExternal));
    core.setOutput('release-notes-path', result.releaseNotesPath ?? '');
    core.setOutput('approval-path', result.approvalPath ?? '');
  } catch (error) {
    core.setOutput('status', 'failed');
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
};

if (process.env.GITHUB_ACTIONS === 'true') run();
