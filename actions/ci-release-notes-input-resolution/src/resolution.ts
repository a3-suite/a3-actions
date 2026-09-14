import fs from 'node:fs';
import path from 'node:path';

type Request = { event: 'tag' | 'workflow_dispatch' };
export type ResolutionInput = {
  requestJson: string;
  inputHandoffDirectory: string;
  outputDirectory: string;
  handoffRunId?: string;
  resolveOnly: boolean;
};
export type ResolutionResult = {
  status: 'success';
  requiresExternal: boolean;
  releaseNotesPath?: string;
  approvalPath?: string;
};

const safePath = (value: string, error: string): string => {
  if (!value || /[\0\r\n]/.test(value)) throw new Error(error);
  return path.resolve(value);
};

const readRequest = (filePath: string): Request => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    throw new Error('release-request-json-invalid');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('release-request-json-invalid');
  const event = (parsed as Record<string, unknown>).event;
  if (event !== 'tag' && event !== 'workflow_dispatch') throw new Error('release-request-event-invalid');
  return { event };
};

const requireFile = (filePath: string, error: string): void => {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile() || fs.statSync(filePath).size === 0) throw new Error(error);
};

export const resolveReleaseNotesInput = (input: ResolutionInput): ResolutionResult => {
  const requestJson = safePath(input.requestJson, 'request-json-required');
  const inputDirectory = safePath(input.inputHandoffDirectory, 'input-handoff-directory-required');
  const outputDirectory = safePath(input.outputDirectory, 'output-directory-required');
  const request = readRequest(requestJson);
  const requiresExternal = request.event === 'tag';
  const releaseNotesPath = path.join(outputDirectory, 'release-notes.json');
  const approvalPath = path.join(outputDirectory, 'release-notes-approval.json');
  if (input.resolveOnly) {
    if (requiresExternal && (fs.existsSync(releaseNotesPath) || fs.existsSync(approvalPath))) throw new Error('release-notes-input-already-present');
    return { status: 'success', requiresExternal };
  }
  if (requiresExternal) {
    if (fs.existsSync(releaseNotesPath) || fs.existsSync(approvalPath)) throw new Error('release-notes-input-already-present');
    if (!input.handoffRunId || /[\0\r\n]/.test(input.handoffRunId)) throw new Error('external-handoff-run-id-required');
    const sourceNotes = path.join(inputDirectory, 'release-notes.json');
    const sourceApproval = path.join(inputDirectory, 'release-notes-approval.json');
    requireFile(sourceNotes, 'release-notes-handoff-missing');
    requireFile(sourceApproval, 'release-notes-approval-handoff-missing');
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.copyFileSync(sourceNotes, releaseNotesPath);
    fs.copyFileSync(sourceApproval, approvalPath);
  }
  requireFile(releaseNotesPath, 'release-notes-missing');
  requireFile(approvalPath, 'release-notes-approval-missing');
  return { status: 'success', requiresExternal, releaseNotesPath, approvalPath };
};
