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
| [`ci-release-notes-input-resolution`](actions/ci-release-notes-input-resolution/README.md) | 外部の承認済み release notes handoff を検証し、publication workflow 用に配置します。 | Validate and materialize an approved release-notes handoff. |
| [`ci-release-request-handoff`](actions/ci-release-request-handoff/README.md) | annotated tag の固定済み source identity を `ci.release-request.v1` handoff へ書き出します。 | Write an immutable annotated-tag release request handoff. |
| [`ci-github-toolchain-verifier`](actions/ci-github-toolchain-verifier/README.md) | GitHub CI で利用する `gh`、`jq`、`sha256sum` の存在と完全一致バージョンを検証するときに使います。 | Verify exact gh, jq, and sha256sum versions for GitHub CI |
| [`ci-rust-release-build`](actions/ci-rust-release-build/README.md) | 固定 source の Rust CLI を、authority と platform manifest に拘束された toolchain／target で buildし、 Release archive、checksum、`asset-manifest.json` を新しい出力ディレクトリへ生成して検証します。 | Build, package, and verify a Rust CLI release asset |
| [`ci-rust-source-gate`](actions/ci-rust-source-gate/README.md) | Rust CLI の Release authority に記録された language profile と source SHA を、現在の checkout に照合します。 | Verify Rust release authority and checked-out source identity |
| [`ci-platform-matrix`](actions/ci-platform-matrix/README.md) | `ci-platform-matrix`は、信頼済みcheckout内のplatform manifestを検証し、GitHub Actionsの strategyへ渡せる`{"include":[...]}`形式のJSONを返します。workflowのjob、runner選択、 permissions、matrix適用は所有しません。 | Validate a CI platform manifest and output a deterministic GitHub matrix. |
| [`ci-package-publication-request`](actions/ci-package-publication-request/README.md) | `ci-package-publication-request` は package publication request handoff を生成または検証します。workflow の repository、event、branch の信頼判定、artifact 転送、job 権限、publish は所有しません。 | Create or verify an immutable package publication request handoff. |
| [`ci-quality-adapter`](actions/ci-quality-adapter/README.md) | `ci-quality-adapter` は trusted descriptor に定義された read-only quality commands を fixed source checkout で実行し、構造化結果を出力します。workflow の checkout、権限、credential、trusted descriptor の選択は所有しません。 | Execute a validated read-only quality adapter against a fixed source checkout. |
| [`ci-release-publication-control`](actions/ci-release-publication-control/README.md) | `ci-release-publication-control` は release publication request の生成、workflow handoff との結合、provenance、公開直前の approval を検証します。artifact の取得、GitHub API、job 権限、credential、publish は workflow が所有します。 | Create and verify release publication request handoffs and provenance. |
| [`ci-jq-provisioner`](actions/ci-jq-provisioner/README.md) | 指定した exact version の jq を公式 Release から検証付きで供給します。 | Install an exact jq release asset after checking its release checksum. |
| [`ci-release-workflow-identity`](actions/ci-release-workflow-identity/README.md) | `ci-release-workflow-identity` は、reusable workflow を呼び出した snapshot が default branch 上の同一 commit であることを検証し、検証済みの workflow commit SHA を出力します。権限、job 境界、公開処理、release 判断は所有しません。 | Verify the trusted default-branch workflow snapshot used by a reusable release workflow. |

<!-- action-catalog:end -->

各 Action の利用条件と `inputs` / `outputs` は、リンク先の README と同じディレクトリの
`action.yml` を参照してください。Action は判定・変換・証跡処理と、公開契約で明示した標準 build adapterを担当し、
workflow の job 境界、認証情報、project-owned adapter、publish そのものは担当しません。

## 共通スクリプト

provider adapter から独立して実行する定型処理は [scripts/](scripts/README.md) を実装正本とします。
Composite Action は同じ ref の script を呼び出し、処理本体を重複して持ちません。

## 開発

開発手順は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。
