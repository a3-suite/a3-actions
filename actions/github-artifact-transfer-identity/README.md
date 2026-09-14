# github-artifact-transfer-identity

GitHub Actions 専用の read-only Action です。期待する workflow run、artifact 名、ID、SHA-256 digest と GitHub API の artifact identity が一致することを確認します。

`github-token` は API 読み取りだけに使い、ログや出力へ書きません。artifact の upload、release、package 公開は行いません。プロジェクトへコピーした後も `skills/` ツリーやこのリポジトリのファイルを参照しません。
