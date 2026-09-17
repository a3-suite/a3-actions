import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const PLATFORM_ID = /^[a-z0-9][a-z0-9-]*$/;
const TARGET = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
const ALLOWED_RUNNERS = new Set(['ubuntu-24.04', 'macos-14', 'windows-2022']);

const isMap = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

export const verifyPlatformSelection = (manifestText, selectedId, selectedTarget) => {
  const manifest = parse(manifestText);
  if (!isMap(manifest) || Object.keys(manifest).join(',') !== 'platforms') {
    throw new Error('platform manifest must contain only a platforms list');
  }
  if (!Array.isArray(manifest.platforms) || manifest.platforms.length === 0) {
    throw new Error('platform manifest must contain at least one platform');
  }

  const ids = new Set();
  const targets = new Set();
  let selected = null;
  for (const [index, value] of manifest.platforms.entries()) {
    if (!isMap(value) || Object.keys(value).sort().join(',') !== 'id,runner,target') {
      throw new Error(`platforms[${index}] must contain id, runner, and target`);
    }
    const { id, runner, target } = value;
    if (typeof id !== 'string' || !PLATFORM_ID.test(id) || ids.has(id)) {
      throw new Error(`platforms[${index}].id is invalid or duplicated`);
    }
    if (typeof runner !== 'string' || !ALLOWED_RUNNERS.has(runner)) {
      throw new Error(`platforms[${index}].runner is not allowed`);
    }
    if (typeof target !== 'string' || !TARGET.test(target) || targets.has(target)) {
      throw new Error(`platforms[${index}].target is invalid or duplicated`);
    }
    ids.add(id);
    targets.add(target);
    if (id === selectedId) selected = { id, target };
  }

  if (selected === null) throw new Error('selected platform id is not present in the manifest');
  if (selected.target !== selectedTarget) throw new Error('selected platform target does not match the manifest');
};

const main = () => {
  const [manifestPath, selectedId, selectedTarget] = process.argv.slice(2);
  if (!manifestPath || !selectedId || !selectedTarget) {
    throw new Error('usage: verify-platform-manifest.js <manifest> <platform-id> <platform-target>');
  }
  verifyPlatformSelection(fs.readFileSync(manifestPath, 'utf8'), selectedId, selectedTarget);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
