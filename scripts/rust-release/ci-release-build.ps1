param(
  [Parameter(Mandatory = $true)][string]$Profile,
  [Parameter(Mandatory = $true)][string]$PlatformManifest,
  [Parameter(Mandatory = $true)][string]$Toolchain,
  [Parameter(Mandatory = $true)][string]$PlatformId,
  [Parameter(Mandatory = $true)][string]$PlatformTarget,
  [Parameter(Mandatory = $true)][string]$AuthorityPath,
  [Parameter(Mandatory = $true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'

$manifestPath = $env:CI_CARGO_MANIFEST_PATH
$binaryName = $env:CI_RELEASE_BINARY_NAME
$versionPrefix = $env:CI_RELEASE_VERSION_PREFIX
$assetPrefix = $env:CI_RELEASE_ASSET_PREFIX
if ($Profile -ne 'rust') { throw 'language profile mismatch' }
foreach ($value in @($manifestPath, $binaryName, $versionPrefix, $assetPrefix)) {
  if ([string]::IsNullOrWhiteSpace($value)) { throw 'rust release setting missing' }
}
if (Test-Path -LiteralPath $OutputDirectory) { throw 'output directory already exists' }

$authority = Get-Content -LiteralPath $AuthorityPath -Raw | ConvertFrom-Json
if ($authority.language_profile -ne $Profile) { throw 'authority language profile mismatch' }
if ($authority.toolchain_version -ne $Toolchain) { throw 'authority toolchain mismatch' }
if ($authority.platform_manifest -ne $PlatformManifest) { throw 'authority platform manifest mismatch' }
if ((git rev-parse HEAD) -ne $authority.source_sha) { throw 'source identity mismatch' }
$manifestBytes = [Text.Encoding]::UTF8.GetBytes((Get-Content -LiteralPath $PlatformManifest -Raw).Replace("`r", ''))
$manifestHash = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($manifestBytes)).Replace('-', '').ToLowerInvariant()
if ($manifestHash -ne $authority.platform_manifest_sha256) {
  throw 'platform manifest identity mismatch'
}

rustup toolchain install $Toolchain --profile minimal
if ($LASTEXITCODE -ne 0) { throw 'rust toolchain setup failed' }
$metadata = cargo "+$Toolchain" metadata --manifest-path $manifestPath --locked --no-deps --format-version 1 | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'cargo metadata failed' }
$resolvedManifest = (Resolve-Path -LiteralPath $manifestPath).Path
$package = $metadata.packages | Where-Object { $_.manifest_path -eq $resolvedManifest }
if ($null -eq $package -or $package.version -cne $authority.version) { throw 'package version mismatch' }

rustup target add --toolchain $Toolchain $PlatformTarget
if ($LASTEXITCODE -ne 0) { throw 'rustup target setup failed' }
cargo "+$Toolchain" build --manifest-path $manifestPath --locked --release --target $PlatformTarget --bin $binaryName
if ($LASTEXITCODE -ne 0) { throw 'cargo build failed' }
$binaryPath = Join-Path $metadata.target_directory "$PlatformTarget/release/$binaryName.exe"
if (-not (Test-Path -LiteralPath $binaryPath -PathType Leaf)) { throw 'release binary missing' }
$binaryVersion = & $binaryPath --version
if ($LASTEXITCODE -ne 0) { throw 'binary version command failed' }
if ($binaryVersion -cne "$versionPrefix$($authority.version)") { throw 'binary version mismatch' }

& (Join-Path $PSScriptRoot 'package-release.ps1') $binaryPath "$binaryName.exe" $assetPrefix $authority.version $PlatformId $PlatformTarget $authority.source_sha $OutputDirectory
& (Join-Path $PSScriptRoot 'verify-release-asset.ps1') "$binaryName.exe" $assetPrefix $authority.version $PlatformId $PlatformTarget $authority.source_sha $OutputDirectory
