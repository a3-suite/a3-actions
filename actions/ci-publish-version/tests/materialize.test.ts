import { strict as assert } from 'node:assert';
import test from 'node:test';
import { materializePublishVersion } from '../src/materialize.js';

test('materializes an exact version', () => {
  assert.equal(materializePublishVersion({ strategy: 'exact', publishVersion: '1.2.3' }), '1.2.3');
});

test('materializes a generated version from all referenced components', () => {
  assert.equal(
    materializePublishVersion({
      strategy: 'ciGenerated',
      template: '{baseVersion}-dev.{build}',
      components: { baseVersion: '1.2.3', build: '42' },
    }),
    '1.2.3-dev.42',
  );
});

test('rejects a missing component', () => {
  assert.throws(
    () => materializePublishVersion({ strategy: 'ciGenerated', template: '{baseVersion}-{build}', components: { baseVersion: '1.2.3' } }),
    /publish-version-plan-component-missing/,
  );
});

test('rejects an unused component', () => {
  assert.throws(
    () => materializePublishVersion({ strategy: 'ciGenerated', template: '{baseVersion}', components: { baseVersion: '1.2.3', build: '42' } }),
    /publish-version-plan-component-unused/,
  );
});

test('rejects unsupported strategies and output-breaking values', () => {
  assert.throws(() => materializePublishVersion({ strategy: 'manifestInferred', publishVersion: '1.2.3' }), /publish-version-plan-strategy-invalid/);
  assert.throws(() => materializePublishVersion({ strategy: 'exact', publishVersion: '1.2.3\nforged=true' }), /publish-version-plan-exact-version-invalid/);
});
