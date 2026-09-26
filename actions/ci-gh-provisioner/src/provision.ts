import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, chmod, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

type FetchAsset = (url: string) => Promise<Buffer>;

export type ProvisionRequest = {
  version: string;
  runnerOs: string;
  runnerArch: string;
  tempRoot: string;
  fetchAsset: FetchAsset;
};

export function selectAsset(version: string, runnerOs: string, runnerArch: string): string {
  const platforms: Record<string, Record<string, string>> = {
    Linux: { X64: 'linux_amd64', ARM64: 'linux_arm64' },
  };
  const platform = platforms[runnerOs]?.[runnerArch];
  if (!platform) throw new Error(`gh-provision-failed: unsupported runner ${runnerOs}/${runnerArch}`);
  return `gh_${version}_${platform}.tar.gz`;
}

function expectedDigest(manifest: string, asset: string): string {
  const matches = manifest.split(/\r?\n/).map((line) =>
    line.match(/^([0-9a-f]{64})\s+\*?([^\s]+)$/),
  ).filter((match) => match?.[2] === asset);
  if (matches.length !== 1) throw new Error(`gh-provision-failed: checksum entry for ${asset} must occur once`);
  return matches[0]![1];
}

function extractMember(archivePath: string, destination: string, member: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('tar', ['-xzf', archivePath, '-C', destination, '--strip-components=2', member], (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function installGh(archive: Buffer, asset: string, tempRoot: string): Promise<string> {
  let directory: string;
  try {
    directory = await mkdtemp(path.join(tempRoot, 'ci-gh-'));
  } catch (error) {
    throw new Error(`gh-provision-failed: install: ${String(error)}`);
  }
  const archivePath = path.join(directory, 'gh-release.tar.gz');
  const installed = path.join(directory, 'gh');
  try {
    await writeFile(archivePath, archive, { mode: 0o600 });
    await extractMember(archivePath, directory, `${asset.replace(/\.tar\.gz$/, '')}/bin/gh`);
    await chmod(installed, 0o755);
    await unlink(archivePath);
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw new Error(`gh-provision-failed: install: ${String(error)}`);
  }
  return installed;
}

export async function provisionGh(request: ProvisionRequest): Promise<string> {
  const { version, runnerOs, runnerArch, tempRoot, fetchAsset } = request;
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('gh-provision-failed: invalid exact version');
  }
  const asset = selectAsset(version, runnerOs, runnerArch);
  const releaseUrl = `https://github.com/cli/cli/releases/download/v${version}`;
  let manifest: Buffer;
  let archive: Buffer;
  try {
    manifest = await fetchAsset(`${releaseUrl}/gh_${version}_checksums.txt`);
    archive = await fetchAsset(`${releaseUrl}/${asset}`);
  } catch (error) {
    throw new Error(`gh-provision-failed: download: ${String(error)}`);
  }
  const expected = expectedDigest(manifest.toString('utf8'), asset);
  const actual = createHash('sha256').update(archive).digest('hex');
  if (actual !== expected) throw new Error(`gh-provision-failed: checksum mismatch for ${asset}`);

  return installGh(archive, asset, tempRoot);
}

export async function provisionGhOnPath(request: ProvisionRequest, githubPath: string): Promise<string> {
  const installed = await provisionGh(request);
  try {
    await appendFile(githubPath, `${path.dirname(installed)}\n`, 'utf8');
  } catch (error) {
    await rm(path.dirname(installed), { recursive: true, force: true });
    throw new Error(`gh-provision-failed: PATH update: ${String(error)}`);
  }
  return installed;
}
