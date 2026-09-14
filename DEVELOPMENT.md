# Development

## 読む順序

1. `README.md`
2. [保守方針](docs/maintenance/README.md)
3. [リリース方針](docs/release/README.md)

## SSOT

- Action の公開契約: `actions/<action-name>/action.yml`
- Action 固有の要求・仕様・設計: `actions/<action-name>/docs/`
- リポジトリ横断の要求・仕様・設計: `docs/`
- SDD の DSL: `sdd-framework` で解決した owner の正本

## README Action一覧

Action の追加・削除時は、コミット前に一覧を正本から更新します。

```sh
node .github/scripts/update-action-index.mjs --write
```

コミットゲートは `--check` で README の一覧が同期済みか検証します。

Action の `dist/` 同一性は、各 package の build 後に次のゲートで検証します。

```sh
node .github/scripts/check-action-dist.mjs
```

## ブランチ

通常の作業は `develop` から `feature/*` を作成します。`main`、`develop`、
`release/*`、`hotfix/*` の扱いは git-branch-strategy の正本に従います。
