import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(scriptRoot, '../..');
const hasPwsh = spawnSync('pwsh', ['--version'], { encoding: 'utf8' }).status === 0;

const withFixture = (callback) => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'a3-actions-rust-release-'));
  try {
    callback(fixture);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
    assert.equal(existsSync(fixture), false);
  }
};

const run = (command, args, options = {}) => spawnSync(command, args, {
  cwd: repositoryRoot,
  encoding: 'utf8',
  ...options,
});

const sha256 = (content) => createHash('sha256').update(content.replaceAll('\r', '')).digest('hex');

test('source gate accepts the bound checkout and rejects a different source SHA', () => withFixture((fixture) => {
  const authority = path.join(fixture, 'authority.json');
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();
  writeFileSync(authority, JSON.stringify({ language_profile: 'rust', source_sha: sourceSha }));

  const accepted = run(path.join(scriptRoot, 'ci-source-gate.sh'), ['rust', authority]);
  assert.equal(accepted.status, 0, accepted.stderr);

  writeFileSync(authority, JSON.stringify({ language_profile: 'rust', source_sha: 'a'.repeat(40) }));
  const rejected = run(path.join(scriptRoot, 'ci-source-gate.sh'), ['rust', authority]);
  assert.notEqual(rejected.status, 0);
}));

test('release build binds exact toolchain and a unique manifest platform before building', () => withFixture((fixture) => {
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();
  const isLinux = process.platform === 'linux';
  const platformId = isLinux ? 'linux-x64' : 'macos-x64';
  const platformTarget = isLinux ? 'x86_64-unknown-linux-gnu' : 'x86_64-apple-darwin';
  const mismatchedTarget = isLinux ? 'aarch64-unknown-linux-gnu' : 'aarch64-apple-darwin';
  const runner = isLinux ? 'ubuntu-24.04' : 'macos-14';
  const manifestPath = path.join(fixture, 'platform-manifest.yml');
  const manifestText = `platforms:\n  - {id: ${platformId}, runner: ${runner}, target: ${platformTarget}}\n`;
  writeFileSync(manifestPath, manifestText);
  const cargoManifest = path.join(fixture, 'Cargo.toml');
  writeFileSync(cargoManifest, "[package]\nname='example-cli'\nversion='1.2.3'\n");
  const authorityPath = path.join(fixture, 'authority.json');
  const writeAuthority = (toolchain, platformManifest = manifestPath, content = manifestText) => {
    writeFileSync(authorityPath, JSON.stringify({
      language_profile: 'rust',
      toolchain_version: toolchain,
      platform_manifest: platformManifest,
      platform_manifest_sha256: sha256(content),
      source_sha: sourceSha,
      version: '1.2.3',
    }));
  };
  writeAuthority('1.90.0');

  const fakeBin = path.join(fixture, 'bin');
  const targetDirectory = path.join(fixture, 'target');
  mkdirSync(fakeBin);
  const rustup = path.join(fakeBin, 'rustup');
  writeFileSync(rustup, '#!/usr/bin/env bash\nexit 0\n');
  chmodSync(rustup, 0o755);
  const cargo = path.join(fakeBin, 'cargo');
  writeFileSync(cargo, [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'if [[ " $* " == *" metadata "* ]]; then',
    "  jq -n --arg manifest \"$FAKE_MANIFEST\" --arg target \"$FAKE_TARGET_DIR\" '{packages:[{manifest_path:$manifest,version:\"1.2.3\"}],target_directory:$target}'",
    '  exit 0',
    'fi',
    'mkdir -p "$FAKE_TARGET_DIR/$FAKE_TARGET/release"',
    'cat > "$FAKE_TARGET_DIR/$FAKE_TARGET/release/example-cli" <<SCRIPT',
    '#!/usr/bin/env bash',
    "printf '%s\\n' 'example-cli 1.2.3'",
    'SCRIPT',
    'chmod +x "$FAKE_TARGET_DIR/$FAKE_TARGET/release/example-cli"',
    '',
  ].join('\n'));
  chmodSync(cargo, 0o755);
  const environment = {
    ...process.env,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
    CI_CARGO_MANIFEST_PATH: cargoManifest,
    CI_RELEASE_BINARY_NAME: 'example-cli',
    CI_RELEASE_VERSION_PREFIX: 'example-cli ',
    CI_RELEASE_ASSET_PREFIX: 'example-cli',
    FAKE_MANIFEST: cargoManifest,
    FAKE_TARGET_DIR: targetDirectory,
    FAKE_TARGET: platformTarget,
  };
  const args = (toolchain, target, output) => [
    'rust', manifestPath, toolchain, platformId, target, authorityPath, output,
  ];

  const accepted = run(path.join(scriptRoot, 'ci-release-build.sh'), args(
    '1.90.0', platformTarget, path.join(fixture, 'accepted-output'),
  ), { env: environment });
  assert.equal(accepted.status, 0, accepted.stderr);

  const targetMismatch = run(path.join(scriptRoot, 'ci-release-build.sh'), args(
    '1.90.0', mismatchedTarget, path.join(fixture, 'mismatch-output'),
  ), { env: environment });
  assert.notEqual(targetMismatch.status, 0);

  writeAuthority('stable');
  const mutableToolchain = run(path.join(scriptRoot, 'ci-release-build.sh'), args(
    'stable', platformTarget, path.join(fixture, 'stable-output'),
  ), { env: environment });
  assert.notEqual(mutableToolchain.status, 0);

  const duplicateText = [
    'platforms:',
    `  - {id: ${platformId}, runner: ${runner}, target: ${platformTarget}}`,
    `  - {id: ${platformId}, runner: ${runner}, target: ${mismatchedTarget}}`,
    '',
  ].join('\n');
  writeFileSync(manifestPath, duplicateText);
  writeAuthority('1.90.0', manifestPath, duplicateText);
  const duplicate = run(path.join(scriptRoot, 'ci-release-build.sh'), args(
    '1.90.0', platformTarget, path.join(fixture, 'duplicate-output'),
  ), { env: environment });
  assert.notEqual(duplicate.status, 0);
}));

test('Unix package and verification bind archive, checksum, manifest, and source without overwrite', () => withFixture((fixture) => {
  const binary = path.join(fixture, 'example-cli');
  const output = path.join(fixture, 'release-output');
  const sourceSha = 'a'.repeat(40);
  writeFileSync(binary, 'release-binary');
  chmodSync(binary, 0o755);

  const packageArgs = [
    binary,
    'example-cli',
    'example-cli',
    '1.2.3',
    'test-x64',
    'x86_64-test-platform',
    sourceSha,
    `${output}${path.sep}`,
  ];
  const verifyArgs = [
    'example-cli',
    'example-cli',
    '1.2.3',
    'test-x64',
    'x86_64-test-platform',
    sourceSha,
    output,
  ];

  const created = run(path.join(scriptRoot, 'package-release-unix.sh'), packageArgs);
  assert.equal(created.status, 0, created.stderr);
  const verified = run(path.join(scriptRoot, 'verify-release-asset-unix.sh'), verifyArgs);
  assert.equal(verified.status, 0, verified.stderr);

  const manifestPath = path.join(output, 'asset-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), [
    'assets',
    'kind',
    'platform_id',
    'platform_target',
    'schema_version',
    'source_sha',
    'version',
  ]);
  assert.equal(manifest.kind, 'ci-release-build-manifest');
  assert.equal(manifest.source_sha, sourceSha);
  assert.equal(manifest.assets.length, 1);

  const archive = path.join(output, manifest.assets[0].path);
  const originalArchive = readFileSync(archive);
  const repeated = run(path.join(scriptRoot, 'package-release-unix.sh'), packageArgs);
  assert.notEqual(repeated.status, 0);
  assert.deepEqual(readFileSync(archive), originalArchive);

  manifest.source_sha = 'b'.repeat(40);
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const tampered = run(path.join(scriptRoot, 'verify-release-asset-unix.sh'), verifyArgs);
  assert.notEqual(tampered.status, 0);
}));

test('Unix package failure leaves no final or temporary output directory', () => withFixture((fixture) => {
  const binary = path.join(fixture, 'example-cli');
  const output = path.join(fixture, 'release-output');
  const fakeBin = path.join(fixture, 'bin');
  mkdirSync(fakeBin);
  writeFileSync(binary, 'release-binary');
  chmodSync(binary, 0o755);
  const tar = path.join(fakeBin, 'tar');
  writeFileSync(tar, '#!/usr/bin/env bash\nexit 1\n');
  chmodSync(tar, 0o755);

  const failed = run(path.join(scriptRoot, 'package-release-unix.sh'), [
    binary,
    'example-cli',
    'example-cli',
    '1.2.3',
    'test-x64',
    'x86_64-test-platform',
    'a'.repeat(40),
    `${output}${path.sep}`,
  ], { env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH}` } });

  assert.notEqual(failed.status, 0);
  assert.equal(existsSync(output), false);
  assert.deepEqual(
    readdirSync(fixture).filter((name) => name.startsWith('release-output.tmp.')),
    [],
  );
}));

test('Unix package preserves an output directory created immediately before publication', () => withFixture((fixture) => {
  const binary = path.join(fixture, 'example-cli');
  const output = path.join(fixture, 'release-output');
  const fakeBin = path.join(fixture, 'bin');
  mkdirSync(fakeBin);
  writeFileSync(binary, 'release-binary');
  chmodSync(binary, 0o755);
  const mkdir = path.join(fakeBin, 'mkdir');
  writeFileSync(mkdir, [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'if [[ "$#" -eq 1 && "$1" == "$RACE_OUTPUT" ]]; then',
    '  /bin/mkdir "$1"',
    '  : > "$1/competitor-owned"',
    '  exit 1',
    'fi',
    'exec /bin/mkdir "$@"',
    '',
  ].join('\n'));
  chmodSync(mkdir, 0o755);

  const raced = run(path.join(scriptRoot, 'package-release-unix.sh'), [
    binary,
    'example-cli',
    'example-cli',
    '1.2.3',
    'test-x64',
    'x86_64-test-platform',
    'a'.repeat(40),
    output,
  ], {
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
      RACE_OUTPUT: output,
    },
  });

  assert.notEqual(raced.status, 0);
  assert.deepEqual(readdirSync(output), ['competitor-owned']);
  assert.deepEqual(
    readdirSync(fixture).filter((name) => name.startsWith('release-output.tmp.')),
    [],
  );
}));

test('Unix package removes its claimed output when publication fails', () => withFixture((fixture) => {
  const binary = path.join(fixture, 'example-cli');
  const output = path.join(fixture, 'release-output');
  const fakeBin = path.join(fixture, 'bin');
  const moveCount = path.join(fixture, 'move-count');
  mkdirSync(fakeBin);
  writeFileSync(binary, 'release-binary');
  chmodSync(binary, 0o755);
  const mv = path.join(fakeBin, 'mv');
  writeFileSync(mv, [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'count=0',
    'if [[ -f "$MOVE_COUNT" ]]; then count=$(<"$MOVE_COUNT"); fi',
    'count=$((count + 1))',
    'printf "%s" "$count" > "$MOVE_COUNT"',
    'if [[ "$count" -eq 2 ]]; then exit 1; fi',
    'exec /bin/mv "$@"',
    '',
  ].join('\n'));
  chmodSync(mv, 0o755);

  const failed = run(path.join(scriptRoot, 'package-release-unix.sh'), [
    binary,
    'example-cli',
    'example-cli',
    '1.2.3',
    'test-x64',
    'x86_64-test-platform',
    'a'.repeat(40),
    output,
  ], {
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
      MOVE_COUNT: moveCount,
    },
  });

  assert.notEqual(failed.status, 0);
  assert.equal(existsSync(output), false);
  assert.deepEqual(
    readdirSync(fixture).filter((name) => name.startsWith('release-output.tmp.')),
    [],
  );
}));

test('PowerShell package and verification roundtrip when pwsh is available', { skip: !hasPwsh }, () => withFixture((fixture) => {
  const binary = path.join(fixture, 'example-cli.exe');
  const output = path.join(fixture, 'release-output');
  writeFileSync(binary, 'release-binary');

  const common = [
    binary,
    'example-cli.exe',
    'example-cli',
    '1.2.3',
    'windows-x64',
    'x86_64-pc-windows-msvc',
    'a'.repeat(40),
    `${output}${path.sep}`,
  ];
  const created = run('pwsh', ['-NoLogo', '-NoProfile', '-File', path.join(scriptRoot, 'package-release.ps1'), ...common]);
  assert.equal(created.status, 0, created.stderr);
  const verified = run('pwsh', [
    '-NoLogo',
    '-NoProfile',
    '-File',
    path.join(scriptRoot, 'verify-release-asset.ps1'),
    ...common.slice(1),
  ]);
  assert.equal(verified.status, 0, verified.stderr);
}));

test('Windows build uses case-sensitive package and binary version checks', () => {
  const script = readFileSync(path.join(scriptRoot, 'ci-release-build.ps1'), 'utf8');
  assert.match(script, /\$package\.version -cne \$authority\.version/);
  assert.match(script, /\$binaryVersion -cne "\$versionPrefix\$\(\$authority\.version\)"/);
});

test('Windows package verifies staging before publishing the final output directory', () => {
  const script = readFileSync(path.join(scriptRoot, 'package-release.ps1'), 'utf8');
  assert.match(script, /verify-release-asset\.ps1.*\$staging/);
  assert.match(script, /TrimEnd\(\[IO\.Path\]::DirectorySeparatorChar/);
  assert.match(script, /\[IO\.Directory\]::Move\(\$staging, \$outputPath\)/);
  assert.match(script, /\[IO\.Directory\]::Delete\(\$staging, \$true\)/);
});
