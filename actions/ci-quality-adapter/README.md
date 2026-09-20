# ci-quality-adapter

`ci-quality-adapter` は trusted descriptor に定義された read-only quality commands を fixed source checkout で実行し、構造化結果を出力します。workflow の checkout、権限、credential、trusted descriptor の選択は所有しません。

`bundle-path`、`source-root`、`toolchain-version` は必須です。project script の一致を要求する場合は `require-trusted-project-scripts: true` と `trusted-project-root` を指定します。outputs は `status` と `result-path` です。
