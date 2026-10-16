import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { archiveBuild, artifactNames } from './archive-cv.mjs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('resume/provenance.json', root), 'utf8'));
const attestationUrl = process.env.ATTESTATION_URL;
const runId = process.env.GITHUB_RUN_ID;
const attempt = process.env.GITHUB_RUN_ATTEMPT;

if (
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.GITHUB_REPOSITORY !== 'gyng/gyng.github.io' ||
  !/^\d+$/.test(runId ?? '') ||
  !/^\d+$/.test(attempt ?? '') ||
  !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? '') ||
  !/^https:\/\/github\.com\/gyng\/gyng\.github\.io\/attestations\/\d+$/.test(
    attestationUrl ?? '',
  ) ||
  manifest.build?.environment !== 'github-actions' ||
  manifest.build.commit !== process.env.GITHUB_SHA ||
  manifest.build.url !==
    `https://github.com/gyng/gyng.github.io/actions/runs/${runId}/attempts/${attempt}`
) {
  throw new Error('Missing or mismatched GitHub attestation identity.');
}

// The PDF already contains this run-specific URL. Fill its destination only
// after signature verification, without changing the PDF or signed manifest.
const directory = new URL('resume/attestations/', root);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL(`${runId}-${attempt}.html`, directory),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="0; url=${attestationUrl}">
    <link rel="canonical" href="${attestationUrl}">
    <title>Resume build attestation</title>
  </head>
  <body>
    <p><a href="${attestationUrl}">Open the resume build attestation on GitHub</a>.</p>
  </body>
</html>
`,
  { flag: 'wx' },
);
console.log(`Recorded attestation link for run ${runId}, attempt ${attempt}.`);
const artifacts = Object.fromEntries(
  await Promise.all(
    artifactNames.map(async (name) => [name, await readFile(new URL(`resume/${name}`, root))]),
  ),
);
await archiveBuild(root, artifacts, attestationUrl);
console.log('Archived signed PDF and verification files.');
