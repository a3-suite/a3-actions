export type ExpectedIdentity = {
  runId: string;
  name: string;
  id: string;
  digest: string;
};

export type ProviderArtifact = {
  workflow_run?: { id?: unknown };
  name?: unknown;
  id?: unknown;
  digest?: unknown;
};

export const normalizeDigest = (value: string): string => {
  if (/^sha256:[a-f0-9]{64}$/.test(value)) return value;
  if (/^[a-f0-9]{64}$/.test(value)) return `sha256:${value}`;
  throw new Error('artifact-transfer-digest-invalid');
};

const text = (value: string, field: string): string => {
  if (!value || /[\0\r\n]/.test(value)) throw new Error(`artifact-transfer-${field}-invalid`);
  return value;
};

export const validateExpectedIdentity = (value: ExpectedIdentity): ExpectedIdentity => {
  const runId = text(value.runId, 'run-id');
  const name = text(value.name, 'name');
  const id = text(value.id, 'id');
  if (!/^\d+$/.test(runId)) throw new Error('artifact-transfer-run-id-invalid');
  if (!/^\d+$/.test(id)) throw new Error('artifact-transfer-id-invalid');
  return { runId, name, id, digest: normalizeDigest(text(value.digest, 'digest')) };
};

const providerText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error(`artifact-transfer-provider-${field}-invalid`);
  return String(value);
};

export const verifyProviderArtifact = (expectedInput: ExpectedIdentity, provider: ProviderArtifact): ExpectedIdentity => {
  const expected = validateExpectedIdentity(expectedInput);
  const actual: ExpectedIdentity = {
    runId: providerText(provider.workflow_run?.id, 'run'),
    name: providerText(provider.name, 'name'),
    id: providerText(provider.id, 'id'),
    digest: normalizeDigest(providerText(provider.digest, 'digest')),
  };
  if (actual.runId !== expected.runId) throw new Error('artifact-transfer-provider-run-mismatch');
  if (actual.name !== expected.name) throw new Error('artifact-transfer-provider-name-mismatch');
  if (actual.id !== expected.id) throw new Error('artifact-transfer-provider-id-mismatch');
  if (actual.digest !== expected.digest) throw new Error('artifact-transfer-provider-digest-mismatch');
  return expected;
};
