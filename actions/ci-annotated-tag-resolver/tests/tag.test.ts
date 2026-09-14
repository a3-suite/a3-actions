import { strict as assert } from 'node:assert';
import test from 'node:test';
import { resolveAnnotatedTag } from '../src/tag.js';

const tagSha = 'a'.repeat(40);
const sourceSha = 'b'.repeat(40);

test('resolves an annotated tag to its commit', async () => {
  const calls: string[] = [];
  const fetchImpl = async (url: string): Promise<Response> => {
    calls.push(url);
    const body = calls.length === 1
      ? { object: { type: 'tag', sha: tagSha } }
      : { object: { type: 'commit', sha: sourceSha } };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  assert.deepEqual(await resolveAnnotatedTag('owner/repo', 'v1.2.3', 'token', 'https://api.example.test', fetchImpl), { tagObjectSha: tagSha, tagObjectType: 'tag', sourceSha });
  assert.match(calls[0], /git\/ref\/tags\/v1.2.3$/);
});

test('rejects a lightweight tag', async () => {
  const fetchImpl = async (): Promise<Response> => new Response(JSON.stringify({ object: { type: 'commit', sha: sourceSha } }), { status: 200 });
  await assert.rejects(resolveAnnotatedTag('owner/repo', 'v1.2.3', 'token', 'https://api.example.test', fetchImpl), /annotated-tag-required/);
});
