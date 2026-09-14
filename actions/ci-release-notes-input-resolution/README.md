# ci-release-notes-input-resolution

Release request の event に応じて release notes 入力を選択し、publication workflow が使うディレクトリへ正規化します。

tag event では外部 approved notes handoff を要求してコピーします。`ci-release-notes-binding` の本文・承認 digest 検証は行いません。

```yaml
- uses: a3-suite/a3-actions/actions/ci-release-notes-input-resolution@<40-char-commit-sha>
  with:
    request-json: release-request/release-request.json
    input-handoff-directory: release-notes-handoff
    output-directory: release-request
    handoff-run-id: ${{ vars.CI_RELEASE_NOTES_HANDOFF_RUN_ID }}
```
