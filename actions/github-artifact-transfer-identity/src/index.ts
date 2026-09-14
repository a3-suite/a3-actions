import * as core from '@actions/core';
import { validateExpectedIdentity, verifyProviderArtifact } from './identity.js';

const repositoryPattern = /^[^/\s]+\/[^/\s]+$/;

const requiredText = (name: string): string => core.getInput(name, { required: true });

export const run = async (): Promise<void> => {
  try {
    const token = requiredText('github-token');
    if (!token || /[\0\r\n]/.test(token)) throw new Error('github-token-invalid');
    const repository = requiredText('repository');
    if (!repositoryPattern.test(repository)) throw new Error('github-repository-invalid');
    const expected = validateExpectedIdentity({
      runId: requiredText('run-id'),
      name: requiredText('artifact-name'),
      id: requiredText('artifact-id'),
      digest: requiredText('artifact-digest'),
    });
    const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';
    const url = `${apiBase.replace(/\/$/, '')}/repos/${repository.split('/').map(encodeURIComponent).join('/')}/actions/artifacts/${encodeURIComponent(expected.id)}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) throw new Error(`artifact-transfer-api-status-${response.status}`);
    let provider: unknown;
    try {
      provider = await response.json();
    } catch {
      throw new Error('artifact-transfer-api-response-invalid');
    }
    const verified = verifyProviderArtifact(expected, provider as Parameters<typeof verifyProviderArtifact>[1]);
    core.setOutput('status', 'success');
    core.setOutput('artifact-transfer-run-id', verified.runId);
    core.setOutput('artifact-transfer-name', verified.name);
    core.setOutput('artifact-transfer-id', verified.id);
    core.setOutput('artifact-transfer-digest', verified.digest);
  } catch (error) {
    core.setOutput('status', 'failed');
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
};

if (process.env.GITHUB_ACTIONS === 'true') void run().finally(() => process.exit(process.exitCode ?? 0));
