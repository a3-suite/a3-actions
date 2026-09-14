# ci-release-request-handoff

固定済みの release request 入力を `ci.release-request.v1` handoff と release notes artifacts へ書き出します。

`manual` は承認済み本文と approval を生成し、`tag` は version 解決を authority に委譲した request だけを生成します。Action は承認や公開可否を判断しません。

```yaml
- uses: a3-suite/a3-actions/actions/ci-release-request-handoff@<40-char-commit-sha>
  with:
    mode: manual
    output-directory: release-request
    tag-source-sha: ${{ steps.tag.outputs.source-sha }}
    tag-object-sha: ${{ steps.tag.outputs.tag-object-sha }}
    release-version: ${{ inputs.release-version }}
    release-tag: ${{ inputs.release-tag }}
    release-notes: ${{ inputs.release-notes }}
    approval-id: ${{ inputs.approval-id }}
    approval-body-sha256: ${{ inputs.approval-body-sha256 }}
    approval-expires-at: ${{ inputs.approval-expires-at }}
    github-ref: ${{ github.ref }}
```
