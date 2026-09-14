import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type HandoffInput = {
  mode: 'manual' | 'tag';
  outputDirectory: string;
  releaseVersion?: string;
  releaseTag?: string;
  releaseNotes?: string;
  approvalId?: string;
  approvalBodySha256?: string;
  approvalExpiresAt?: string;
  tagSourceSha: string;
  tagObjectSha: string;
  githubRef?: string;
  githubRefName?: string;
  requestRunId?: string;
  requestActor?: string;
};

export type HandoffResult = {
  requestPath: string;
  releaseNotesPath?: string;
  approvalPath?: string;
  requestDigestPath: string;
};

const SHA = /^[0-9a-f]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;

const required = (value: string | undefined, error: string, allowNewline = false): string => {
  if (!value || /[\0]/.test(value) || (!allowNewline && /[\r\n]/.test(value))) throw new Error(error);
  return value;
};

const safePath = (value: string): string => {
  const resolved = path.resolve(required(value, 'output-directory-required'));
  if (resolved === path.parse(resolved).root) throw new Error('output-directory-invalid');
  return resolved;
};

const sha = (value: string, error: string): string => {
  if (!SHA.test(value)) throw new Error(error);
  return value;
};

const writeJson = (filePath: string, value: unknown): void => {
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
};

export const writeReleaseRequestHandoff = (input: HandoffInput): HandoffResult => {
  if (input.mode !== 'manual' && input.mode !== 'tag') throw new Error('release-request-mode-invalid');
  const outputDirectory = safePath(input.outputDirectory);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const tagSourceSha = sha(required(input.tagSourceSha, 'tag-source-sha-required'), 'tag-source-sha-invalid');
  const tagObjectSha = sha(required(input.tagObjectSha, 'tag-object-sha-required'), 'tag-object-sha-invalid');
  const requestPath = path.join(outputDirectory, 'release-request.json');
  const common = {
    source_sha: tagSourceSha,
    tag_object_sha: tagObjectSha,
    tag_object_type: 'tag',
    request_run_id: input.requestRunId ?? '',
    request_actor: input.requestActor ?? '',
  };
  let releaseNotesPath: string | undefined;
  let approvalPath: string | undefined;
  if (input.mode === 'manual') {
    const version = required(input.releaseVersion, 'release-version-required');
    const tag = required(input.releaseTag, 'release-tag-required');
    const notes = required(input.releaseNotes, 'release-notes-required', true);
    const approvalId = required(input.approvalId, 'approval-id-required');
    const approvalBodySha256 = required(input.approvalBodySha256, 'approval-body-sha256-required');
    if (!DIGEST.test(approvalBodySha256)) throw new Error('approval-body-sha256-invalid');
    const approvalExpiresAt = required(input.approvalExpiresAt, 'approval-expires-at-required');
    writeJson(requestPath, { schema: 'ci.release-request.v1', event: 'workflow_dispatch', ref: input.githubRef ?? '', ...common, version, tag, release_notes: notes, approval_id: approvalId, approval_expires_at: approvalExpiresAt });
    releaseNotesPath = path.join(outputDirectory, 'release-notes.json');
    approvalPath = path.join(outputDirectory, 'release-notes-approval.json');
    const bodySha256 = crypto.createHash('sha256').update(notes, 'utf8').digest('hex');
    writeJson(releaseNotesPath, { schema: 'ci.release-notes.v1', source_contract: 'git.release-flow', source_field: 'body', release_identity: tag, body: notes, body_sha256: bodySha256 });
    writeJson(approvalPath, { schema: 'ci.release-notes-approval.v1', source_contract: 'git.release-flow', source_field: 'body', release_identity: tag, body_sha256: approvalBodySha256, approval_id: approvalId });
  } else {
    const tag = required(input.githubRefName, 'github-ref-name-required');
    writeJson(requestPath, { schema: 'ci.release-request.v1', event: 'tag', ref: required(input.githubRef, 'github-ref-required'), tag, version: null, version_resolution: 'authority', ...common });
  }
  const requestDigestPath = `${requestPath}.sha256`;
  const requestDigest = crypto.createHash('sha256').update(fs.readFileSync(requestPath)).digest('hex');
  fs.writeFileSync(requestDigestPath, `${requestDigest}  release-request.json\n`, 'utf8');
  return { requestPath, releaseNotesPath, approvalPath, requestDigestPath };
};
