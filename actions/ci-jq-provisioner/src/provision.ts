import { createHash } from 'node:crypto';
import { appendFile, chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

type FetchAsset = (url: string) => Promise<Buffer>;

export type ProvisionRequest = {
  version: string;
  runnerOs: string;
  runnerArch: string;
  tempRoot: string;
  fetchAsset: FetchAsset;
};

export function selectAsset(runnerOs: string, runnerArch: string): string {
  const assets: Record<string, Record<string, string>> = {
    Linux: { X64: 'jq-linux-amd64', ARM64: 'jq-linux-arm64' },
    macOS: { X64: 'jq-macos-amd64', ARM64: 'jq-macos-arm64' },
    Windows: { X64: 'jq-windows-amd64.exe' },
  };
  const asset = assets[runnerOs]?.[runnerArch];
  if (!asset) throw new Error(`jq-provision-failed: unsupported runner ${runnerOs}/${runnerArch}`);
  return asset;
}

function expectedDigest(manifest: string, asset: string): string {
  const matches = manifest.split(/\r?\n/).map((line) =>
    line.match(/^([0-9a-f]{64})\s+\*?([^\s]+)$/),
  ).filter((match) => match?.[2] === asset);
  if (matches.length !== 1) throw new Error(`jq-provision-failed: checksum entry for ${asset} must occur once`);
  return matches[0]![1];
}

export async function provisionJq(request: ProvisionRequest): Promise<string> {
  const { version, runnerOs, runnerArch, tempRoot, fetchAsset } = request;
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(version)) {
    throw new Error('jq-provision-failed: invalid exact version');
  }
  const asset = selectAsset(runnerOs, runnerArch);
  const releaseUrl = `https://github.com/jqlang/jq/releases/download/jq-${version}`;
  let manifest: Buffer;
  let binary: Buffer;
  try {
    manifest = await fetchAsset(`${releaseUrl}/sha256sum.txt`);
    binary = await fetchAsset(`${releaseUrl}/${asset}`);
  } catch (error) {
    throw new Error(`jq-provision-failed: download: ${String(error)}`);
  }
  const expected = expectedDigest(manifest.toString('utf8'), asset);
  const actual = createHash('sha256').update(binary).digest('hex');
  if (actual !== expected) throw new Error(`jq-provision-failed: checksum mismatch for ${asset}`);

  let directory: string;
  try {
    directory = await mkdtemp(path.join(tempRoot, 'ci-jq-'));
  } catch (error) {
    throw new Error(`jq-provision-failed: install: ${String(error)}`);
  }
  const installed = path.join(directory, runnerOs === 'Windows' ? 'jq.exe' : 'jq');
  try {
    await writeFile(installed, binary, { mode: 0o700 });
    if (runnerOs !== 'Windows') await chmod(installed, 0o755);
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw new Error(`jq-provision-failed: install: ${String(error)}`);
  }
  return installed;
}

export async function provisionJqOnPath(request: ProvisionRequest, githubPath: string): Promise<string> {
  const installed = await provisionJq(request);
  try {
    await appendFile(githubPath, `${path.dirname(installed)}\n`, 'utf8');
  } catch (error) {
    await rm(path.dirname(installed), { recursive: true, force: true });
    throw new Error(`jq-provision-failed: PATH update: ${String(error)}`);
  }
  return installed;
}
