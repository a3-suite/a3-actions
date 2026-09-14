import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(__dirname, '..');
const digest = 'a'.repeat(64);
const outputValue = (raw: string, name: string): string => {
  const match = raw.match(new RegExp(`${name}<<[^\\n]+\\n([\\s\\S]*?)\\n[^\\n]+`));
  assert.ok(match, `missing output: ${name}`);
  return match[1];
};

test('bundled entrypoint verifies a mocked GitHub API response', async () => {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ workflow_run: { id: 123 }, name: 'bundle', id: 42, digest: `sha256:${digest}` }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'github-artifact-identity-'));
  const outputPath = path.join(tempRoot, 'outputs');
  fs.writeFileSync(outputPath, '');
  const env = { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_OUTPUT: outputPath,
    GITHUB_API_URL: `http://127.0.0.1:${address.port}`, 'INPUT_GITHUB-TOKEN': 'fixture-token',
    'INPUT_REPOSITORY': 'owner/repo', 'INPUT_RUN-ID': '123', 'INPUT_ARTIFACT-NAME': 'bundle',
    'INPUT_ARTIFACT-ID': '42', 'INPUT_ARTIFACT-DIGEST': digest };
  try {
    const result = await new Promise<{ status: number | null; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(root, 'dist/index.js')], { cwd: root, env });
      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (status) => resolve({ status, stderr }));
    });
    assert.equal(result.status, 0, result.stderr);
    const output = fs.readFileSync(outputPath, 'utf8');
    assert.equal(outputValue(output, 'status'), 'success');
    assert.equal(outputValue(output, 'artifact-transfer-digest'), `sha256:${digest}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
