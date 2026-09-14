# a3-actions

複数の GitHub Actions を管理するリポジトリです。

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

<!-- action-catalog:end -->

各 Action の利用条件と `inputs` / `outputs` は、リンク先の README と同じディレクトリの
`action.yml` を参照してください。Action は判定・変換・証跡処理を担当し、workflow の job 境界、認証情報、
build、publish そのものは担当しません。

## 開発

開発手順は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。
