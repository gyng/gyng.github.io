const element = (id) => document.getElementById(id);
const status = element('verification-status');
const result = element('verification-result');
const input = element('pdf-file');
const dropzone = element('pdf-dropzone');
const publishedButton = element('check-published');
const copyButton = element('copy-command');
const sha256Pattern = /^[a-f0-9]{64}$/;
const buildUrlPattern =
  /^https:\/\/github\.com\/gyng\/gyng\.github\.io\/actions\/runs\/\d+\/attempts\/\d+$/;
let operation = 0;

const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

async function fetchFile(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error('Cannot get the build data. Try again later.');
  return response;
}

async function loadManifest(path = '../provenance.json') {
  const manifest = await (await fetchFile(path)).json();
  if (
    manifest.schemaVersion !== 1 ||
    manifest.pdf?.file !== 'resume.pdf' ||
    !sha256Pattern.test(manifest.pdf?.sha256 ?? '') ||
    !sha256Pattern.test(manifest.source?.sha256 ?? '') ||
    !['local', 'github-actions'].includes(manifest.build?.environment)
  ) {
    throw new Error('Cannot read the current build data. Try again later.');
  }
  if (
    manifest.build.environment === 'github-actions' &&
    !buildUrlPattern.test(manifest.build.url ?? '')
  ) {
    throw new Error('Cannot use the current build link. Try again later.');
  }
  return manifest;
}

async function findArchivedBuild(hash) {
  const index = await (await fetchFile('../builds/index.json')).json();
  if (
    index.schemaVersion !== 1 ||
    !Array.isArray(index.builds) ||
    !index.builds.every(
      (build) =>
        /^\d+-\d+$/.test(build.id ?? '') &&
        sha256Pattern.test(build.pdfSha256 ?? '') &&
        /^[a-f0-9]{40}$/.test(build.sourceCommit ?? '') &&
        /^https:\/\/github\.com\/gyng\/gyng\.github\.io\/attestations\/\d+$/.test(
          build.attestationUrl ?? '',
        ),
    )
  ) {
    throw new Error('Cannot read the build history. Try again later.');
  }
  const entry = index.builds.find((build) => build.pdfSha256 === hash);
  if (!entry) return null;
  const manifest = await loadManifest(`../builds/${entry.id}/provenance.json`);
  const [run, attempt] = entry.id.split('-');
  if (
    manifest.pdf.sha256 !== hash ||
    manifest.build.environment !== 'github-actions' ||
    manifest.build.commit !== entry.sourceCommit ||
    manifest.build.url !==
      `https://github.com/gyng/gyng.github.io/actions/runs/${run}/attempts/${attempt}`
  ) {
    throw new Error('The saved build data does not match. Try again later.');
  }
  return { entry, manifest };
}

function render(file, hash, manifest, archive) {
  const matches = hash === manifest.pdf.sha256;
  const local = manifest.build.environment === 'local';
  status.dataset.state = archive ? 'older' : matches ? 'match' : 'different';
  status.textContent = archive
    ? 'The PDF matches an earlier resume'
    : matches
      ? local
        ? 'The PDF matches the local build — unsigned'
        : 'The PDF matches the current resume'
      : 'No matching published PDF was found';
  element('verification-explanation').textContent = matches
    ? local
      ? 'This local build has no signature.'
      : 'The file check is complete. To check the build signature, open Technical details.'
    : 'This file may have changed, or its build may not be in the archive. Open Technical details to check for a signed build.';
  element('checked-filename').textContent = file.name;
  element('actual-hash').textContent = hash;
  element('expected-hash').textContent = manifest.pdf.sha256;
  element('expected-hash-label').textContent = matches
    ? 'Matched PDF hash (SHA-256)'
    : 'Current PDF hash (SHA-256)';
  element('source-fingerprint').textContent = manifest.source.sha256.slice(0, 12);
  element('build-links').hidden = local;
  element('recorded-build').removeAttribute('href');
  if (!local) element('recorded-build').href = manifest.build.url;
  element('recorded-build').textContent = matches
    ? 'Build and signatures for this version'
    : 'Current build and signatures';
  element('signature-bundle').href = archive
    ? `../builds/${archive.entry.id}/resume.pdf.sigstore.json`
    : '../resume.pdf.sigstore.json';
  element('matched-version-links').hidden = !archive;
  if (archive) {
    element('matched-download').href = `../builds/${archive.entry.id}/resume.pdf`;
    element('matched-attestation').href = archive.entry.attestationUrl;
  }
  element('verification-command').textContent = [
    `gh attestation verify ${shellQuote(`./${file.name}`)} \\`,
    '  --repo gyng/gyng.github.io \\',
    '  --signer-workflow gyng/gyng.github.io/.github/workflows/cv-pdf.yml \\',
    '  --source-ref refs/heads/gh-pages \\',
    '  --deny-self-hosted-runners',
  ].join('\n');
  copyButton.textContent = 'Copy command';
  result.hidden = false;
  element('verification-data').hidden = false;
}

async function check(loadFile) {
  const current = ++operation;
  result.hidden = true;
  element('verification-data').hidden = true;
  publishedButton.disabled = true;
  status.dataset.state = 'working';
  status.textContent = 'Checking your PDF…';
  try {
    if (!globalThis.crypto?.subtle)
      throw new Error('Open this page with HTTPS to check a PDF file.');
    const file = await loadFile();
    if (!file || file.size > 20 * 1024 * 1024)
      throw new Error('Select a PDF file that is 20 MB or smaller.');
    const bytes = await file.arrayBuffer();
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-')
      throw new Error('Cannot read this file as a PDF. Select another file.');
    const [digest, manifest] = await Promise.all([
      crypto.subtle.digest('SHA-256', bytes),
      loadManifest(),
    ]);
    if (current !== operation) return;
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    const archive = hash === manifest.pdf.sha256 ? null : await findArchivedBuild(hash);
    if (current !== operation) return;
    render(file, hash, archive?.manifest ?? manifest, archive);
  } catch (error) {
    if (current !== operation) return;
    status.dataset.state = 'error';
    status.textContent = error.message || 'Cannot complete the check. Try again.';
  } finally {
    if (current === operation) publishedButton.disabled = false;
  }
}

input.addEventListener('change', () => {
  const file = input.files[0];
  if (file) check(() => file);
});
dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.dataset.dragging = '';
});
dropzone.addEventListener('dragleave', () => delete dropzone.dataset.dragging);
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  delete dropzone.dataset.dragging;
  const file = event.dataTransfer.files[0];
  if (file) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    check(() => file);
  }
});
publishedButton.addEventListener('click', () => {
  input.value = '';
  check(async () => {
    const response = await fetchFile('../resume.pdf');
    return new File([await response.blob()], 'resume.pdf', { type: 'application/pdf' });
  });
});
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(element('verification-command').textContent);
    copyButton.textContent = 'Copied';
  } catch {
    copyButton.textContent = 'Select and copy the command above';
  }
});
