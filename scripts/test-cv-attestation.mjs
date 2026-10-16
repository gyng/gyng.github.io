import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('attestation redirects preserve the signed artifacts and build identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cv-attestation-test-'));
  try {
    await mkdir(join(root, 'scripts'));
    await mkdir(join(root, 'resume'));
    await copyFile(
      new URL('record-cv-attestation.mjs', import.meta.url),
      join(root, 'scripts/record-cv-attestation.mjs'),
    );
    await copyFile(
      new URL('archive-cv.mjs', import.meta.url),
      join(root, 'scripts/archive-cv.mjs'),
    );
    const pdf = '%PDF-1.4\nfixture';
    const hash = createHash('sha256').update(pdf).digest('hex');
    const manifest = JSON.stringify({
      pdf: { sha256: hash, bytes: Buffer.byteLength(pdf) },
      build: {
        environment: 'github-actions',
        commit: 'a'.repeat(40),
        url: 'https://github.com/gyng/gyng.github.io/actions/runs/123/attempts/2',
      },
    });
    await writeFile(join(root, 'resume/provenance.json'), manifest);
    await writeFile(join(root, 'resume/resume.pdf'), pdf);
    await writeFile(join(root, 'resume/resume.pdf.sha256'), `${hash}  resume.pdf\n`);
    await writeFile(join(root, 'resume/resume.pdf.sigstore.json'), 'test signature fixture');
    const env = {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'gyng/gyng.github.io',
      GITHUB_SHA: 'a'.repeat(40),
      GITHUB_RUN_ID: '123',
      GITHUB_RUN_ATTEMPT: '2',
      ATTESTATION_URL: 'https://github.com/gyng/gyng.github.io/attestations/456',
    };
    const run = (overrides = {}) =>
      spawnSync(process.execPath, [join(root, 'scripts/record-cv-attestation.mjs')], {
        env: { ...env, ...overrides },
        encoding: 'utf8',
      });
    for (const overrides of [
      { ATTESTATION_URL: 'javascript:alert(1)' },
      { ATTESTATION_URL: 'https://github.com/another/repo/attestations/456' },
      { GITHUB_SHA: 'b'.repeat(40) },
      { GITHUB_RUN_ATTEMPT: '1' },
      { GITHUB_RUN_ID: '../../unexpected' },
      { GITHUB_ACTIONS: 'false' },
    ]) {
      const invalid = run(overrides);
      assert.notEqual(invalid.status, 0);
      assert.match(invalid.stderr, /Missing or mismatched GitHub attestation identity/);
    }
    const valid = run();
    assert.equal(valid.status, 0, valid.stderr);
    const redirect = await readFile(join(root, 'resume/attestations/123-2.html'), 'utf8');
    assert(redirect.includes(`content="0; url=${env.ATTESTATION_URL}"`));
    assert(redirect.includes(`href="${env.ATTESTATION_URL}"`));
    assert.equal(await readFile(join(root, 'resume/provenance.json'), 'utf8'), manifest);
    assert.equal(await readFile(join(root, 'resume/resume.pdf'), 'utf8'), pdf);
    assert.equal(await readFile(join(root, 'resume/builds/123-2/resume.pdf'), 'utf8'), pdf);
    assert.equal(
      await readFile(join(root, 'resume/builds/123-2/provenance.json'), 'utf8'),
      manifest,
    );
    const index = JSON.parse(await readFile(join(root, 'resume/builds/index.json'), 'utf8'));
    assert.equal(index.builds[0].pdfSha256, hash);
    assert.equal(index.builds[0].attestationUrl, env.ATTESTATION_URL);
    const duplicate = run();
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /EEXIST/);
    const laterManifest = JSON.parse(manifest);
    laterManifest.build.url = 'https://github.com/gyng/gyng.github.io/actions/runs/123/attempts/3';
    await writeFile(join(root, 'resume/provenance.json'), JSON.stringify(laterManifest));
    const later = run({ GITHUB_RUN_ATTEMPT: '3' });
    assert.equal(later.status, 0, later.stderr);
    const history = JSON.parse(await readFile(join(root, 'resume/builds/index.json'), 'utf8'));
    assert.deepEqual(
      history.builds.map((build) => build.id),
      ['123-3', '123-2'],
    );
    assert.equal(
      await readFile(join(root, 'resume/builds/123-2/provenance.json'), 'utf8'),
      manifest,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
