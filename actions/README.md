# Actions

各 Action は `actions/<action-name>/` に独立して配置します。

Action ごとに `action.yml`、実装、テスト、`dist/`、README を所有し、他の Action の
内部実装へ直接依存しません。

Action の一覧と用途は、root の [Action一覧](../README.md#action一覧) を参照してください。

これらは read-only の判定・変換・証跡処理です。workflow の job 境界、project adapter、build、publish、
credential 管理は Action に含めません。各 Action の `action.yml` が公開 I/O の正本であり、利用側は mutable alias
ではなく provider 側で承認した固定 commit SHA を指定します。
