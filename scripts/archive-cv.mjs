import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

export const artifactNames = [
  'resume.pdf',
  'provenance.json',
  'resume.pdf.sha256',
  'resume.pdf.sigstore.json',
];

export async function archiveBuild(root, artifacts, attestationUrl) {
  const manifest = JSON.parse(artifacts['provenance.json']);
  const run = manifest.build?.url?.match(
    /^https:\/\/github\.com\/gyng\/gyng\.github\.io\/actions\/runs\/(\d+)\/attempts\/(\d+)$/,
  );
  const hash = createHash('sha256').update(artifacts['resume.pdf']).digest('hex');
  if (
    !run ||
    manifest.build.environment !== 'github-actions' ||
    !/^[a-f0-9]{40}$/.test(manifest.build.commit ?? '') ||
    manifest.pdf?.sha256 !== hash ||
    manifest.pdf.bytes !== artifacts['resume.pdf'].length ||
    artifacts['resume.pdf.sha256'].toString() !== `${hash}  resume.pdf\n` ||
    !artifacts['resume.pdf.sigstore.json']?.length ||
    !/^https:\/\/github\.com\/gyng\/gyng\.github\.io\/attestations\/\d+$/.test(attestationUrl)
  ) {
    throw new Error('Cannot archive an incomplete or mismatched signed build.');
  }
  const id = `${run[1]}-${run[2]}`;
  const directory = new URL('resume/builds/', root);
  let index = { schemaVersion: 1, builds: [] };
  try {
    index = JSON.parse(await readFile(new URL('index.json', directory), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (index.schemaVersion !== 1 || !Array.isArray(index.builds)) {
    throw new Error('Unexpected archive index format.');
  }
  if (index.builds.some((build) => build.id === id)) {
    throw new Error('This build is already archived.');
  }
  const target = new URL(`${id}/`, directory);
  await mkdir(directory, { recursive: true });
  await mkdir(target);
  for (const name of artifactNames) {
    await writeFile(new URL(name, target), artifacts[name], { flag: 'wx' });
  }
  index.builds.push({ id, pdfSha256: hash, sourceCommit: manifest.build.commit, attestationUrl });
  index.builds.sort((a, b) => b.id.localeCompare(a.id, 'en', { numeric: true }));
  await writeFile(new URL('index.json', directory), `${JSON.stringify(index, null, 2)}\n`);
  const rows = index.builds.map(
    (build) =>
      `| ${build.id} | [${build.sourceCommit.slice(0, 12)}](https://github.com/gyng/gyng.github.io/commit/${build.sourceCommit}) | [PDF](${build.id}/resume.pdf) | [Attestation](${build.attestationUrl}) |`,
  );
  await writeFile(
    new URL('index.md', directory),
    `# Resume build history

[Resume](../) · [Download PDF](../resume.pdf) · [Verify resume PDF](../verify/)

Each published signed build is saved here. The first row is the latest build. Local previews are not published.

| Build | Source commit | Download | Signature |
| --- | --- | --- | --- |
${rows.join('\n')}

Each build also has its [verification files](../verify/technical/): provenance.json, resume.pdf.sha256, and resume.pdf.sigstore.json. These files are in the same folder as that build's PDF.
`,
  );
}
