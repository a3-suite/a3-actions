# Scripts

GitHub Actions 以外からも実行できる定型処理を `scripts/<domain>/` に配置します。

各スクリプトはコマンドライン引数、環境変数、終了状態、診断メッセージを公開契約として持ち、
単独でテストできる状態を保ちます。`actions/` 配下の Composite Action は、この実装を同じ ref から
呼び出す薄い adapter とし、処理本体を複製しません。

- `ci-github/`: GitHub CI toolchain の固定版検証
- `rust-release/`: Rust CLI Release の source identity、build、package、artifact 検証
