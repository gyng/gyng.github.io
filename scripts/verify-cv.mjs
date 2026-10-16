import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const [pdf, source, checksum, metadata] = await Promise.all([
  readFile(new URL('resume/resume.pdf', root)),
  readFile(new URL('resume/index.md', root)),
  readFile(new URL('resume/resume.pdf.sha256', root), 'utf8'),
  readFile(new URL('resume/provenance.json', root), 'utf8'),
]);
const manifest = JSON.parse(metadata);
assert.equal(manifest.schemaVersion, 1, 'Unsupported provenance format');
assert.equal(manifest.pdf.file, 'resume.pdf');
assert.equal(manifest.source.file, 'resume/index.md');
assert.equal(manifest.pdf.sha256, sha256(pdf), 'PDF differs from the recorded digest');
assert.equal(manifest.pdf.bytes, pdf.length, 'PDF size differs from the recorded size');
assert.equal(manifest.source.sha256, sha256(source), 'Markdown differs from the recorded source');
assert.equal(checksum, `${sha256(pdf)}  resume.pdf\n`, 'Checksum file differs from the PDF');
console.log('PDF and Markdown SHA-256 checks passed.');
console.log('Use gh attestation verify to check signed GitHub build provenance.');
