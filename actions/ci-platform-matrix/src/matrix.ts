import { parse } from 'yaml';

export type Platform = { id: string; runner: string; target: string };
export type PlatformMatrix = { include: Platform[] };

const PLATFORM_ID = /^[a-z0-9][a-z0-9-]*$/;
const TARGET = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
const ALLOWED_RUNNERS = new Set(['ubuntu-24.04', 'macos-14', 'windows-2022']);
export const MAX_MANIFEST_BYTES = 64 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const resolvePlatformMatrix = (manifestText: string): PlatformMatrix => {
  if (Buffer.byteLength(manifestText, 'utf8') > MAX_MANIFEST_BYTES) {
    throw new Error('platform-matrix-manifest-too-large');
  }

  const manifest = parse(manifestText, { maxAliasCount: 20, uniqueKeys: true }) as unknown;
  if (!isRecord(manifest) || Object.keys(manifest).join(',') !== 'platforms') {
    throw new Error('platform-matrix-root-invalid');
  }
  if (!Array.isArray(manifest.platforms) || manifest.platforms.length === 0) {
    throw new Error('platform-matrix-platforms-empty');
  }

  const ids = new Set<string>();
  const targets = new Set<string>();
  const include = manifest.platforms.map((value, index): Platform => {
    if (!isRecord(value) || Object.keys(value).sort().join(',') !== 'id,runner,target') {
      throw new Error(`platform-matrix-platform-${index}-shape-invalid`);
    }
    const { id, runner, target } = value;
    if (typeof id !== 'string' || !PLATFORM_ID.test(id) || ids.has(id)) {
      throw new Error(`platform-matrix-platform-${index}-id-invalid`);
    }
    if (typeof runner !== 'string' || !ALLOWED_RUNNERS.has(runner)) {
      throw new Error(`platform-matrix-platform-${index}-runner-invalid`);
    }
    if (typeof target !== 'string' || !TARGET.test(target) || targets.has(target)) {
      throw new Error(`platform-matrix-platform-${index}-target-invalid`);
    }
    ids.add(id);
    targets.add(target);
    return { id, runner, target };
  });

  return { include };
};
