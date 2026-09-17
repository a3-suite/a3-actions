# a3-actions

複数の GitHub Actions と、その処理本体として再利用する共通スクリプトを管理するリポジトリです。

## 利用

各 Action は次の形式で利用します。

```yaml
uses: a3-suite/a3-actions/actions/<action-name>@<40-char-commit-sha>
```

## Action一覧

<!-- action-catalog:start -->

| Action | 用途 | 概要 |
| --- | --- | --- |
| [`ci-change-scope`](actions/ci-change-scope/README.md) | 変更内容に応じて CI / documentation checks の実行要否を決めるとき | 差分を documentation-only とその他に分類 |
| [`ci-config-snapshot`](actions/ci-config-snapshot/README.md) | 複数の設定源を解決し、後続処理で同じ設定を再利用するとき | runtime・workflow・preset の優先順位を解決し、snapshot と digest を出力 |
| [`ci-handoff-integrity`](actions/ci-handoff-integrity/README.md) | build 成果物を次の工程へ引き渡す前に整合性を確認するとき | descriptor・manifest・成果物 digest と identity を検証 |
| [`ci-quality-summary`](actions/ci-quality-summary/README.md) | テストや監査の結果を GitHub Actions の summary と証跡へまとめるとき | quality result を集約し、status と evidence digest を出力 |
| [`ci-release-notes-binding`](actions/ci-release-notes-binding/README.md) | 承認済み release notes をリリース identity に結び付けるとき | 本文 digest・承認 digest・identity の一致を検証 |
| [`ci-publish-version`](actions/ci-publish-version/README.md) | 承認済み version plan から公開用バージョンを確定するとき | owner-approved plan を `publish-version` へ具体化 |
| [`ci-vitest-summary`](actions/ci-vitest-summary/README.md) | Vitest の結果を GitHub Actions の summary に変換するとき | Vitest JSON レポートを summary へ変換 |
| [`ci-annotated-tag-resolver`](actions/ci-annotated-tag-resolver/README.md) | Annotated tag を GitHub API で解決し、tag object と source commit の SHA を出力します。tag が lightweight tag の場合は失敗します。 | Resolve an annotated Git tag to its tag object and source commit. |
| [`ci-release-notes-input-resolution`](actions/ci-release-notes-input-resolution/README.md) | Release request の event に応じて release notes 入力を選択し、publication workflow が使うディレクトリへ正規化します。 | Select and normalize release-notes inputs for a release publication workflow. |
| [`ci-release-request-handoff`](actions/ci-release-request-handoff/README.md) | 固定済みの release request 入力を `ci.release-request.v1` handoff と release notes artifacts へ書き出します。 | Write an immutable release request handoff and its release-notes inputs. |
| [`ci-github-toolchain-verifier`](actions/ci-github-toolchain-verifier/README.md) | GitHub CI で利用する `gh`、`jq`、`sha256sum` の存在と完全一致バージョンを検証するときに使います。 | Verify exact gh, jq, and sha256sum versions for GitHub CI |
| [`ci-rust-release-build`](actions/ci-rust-release-build/README.md) | 固定 source の Rust CLI を、authority と platform manifest に拘束された toolchain／target で buildし、 Release archive、checksum、`asset-manifest.json` を新しい出力ディレクトリへ生成して検証します。 | Build, package, and verify a Rust CLI release asset |
| [`ci-rust-source-gate`](actions/ci-rust-source-gate/README.md) | Rust CLI の Release authority に記録された language profile と source SHA を、現在の checkout に照合します。 | Verify Rust release authority and checked-out source identity |

<!-- action-catalog:end -->

各 Action の利用条件と `inputs` / `outputs` は、リンク先の README と同じディレクトリの
`action.yml` を参照してください。Action は判定・変換・証跡処理と、公開契約で明示した標準 build adapterを担当し、
workflow の job 境界、認証情報、project-owned adapter、publish そのものは担当しません。

## 共通スクリプト

provider adapter から独立して実行する定型処理は [scripts/](scripts/README.md) を実装正本とします。
Composite Action は同じ ref の script を呼び出し、処理本体を重複して持ちません。

## 開発

開発手順は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。
