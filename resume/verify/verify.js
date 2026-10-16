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
  if (!response.ok)
    throw new Error(
      'Could not load the published verification files. Try again after the site finishes updating.',
    );
  return response;
}

async function loadManifest() {
  const manifest = await (await fetchFile('../provenance.json')).json();
  if (
    manifest.schemaVersion !== 1 ||
    manifest.pdf?.file !== 'resume.pdf' ||
    !sha256Pattern.test(manifest.pdf?.sha256 ?? '') ||
    !sha256Pattern.test(manifest.source?.sha256 ?? '') ||
    !['local', 'github-actions'].includes(manifest.build?.environment)
  ) {
    throw new Error('The published build manifest has an unexpected format.');
  }
  if (
    manifest.build.environment === 'github-actions' &&
    !buildUrlPattern.test(manifest.build.url ?? '')
  ) {
    throw new Error('The published build link has an unexpected format.');
  }
  return manifest;
}

function render(file, hash, manifest) {
  const matches = hash === manifest.pdf.sha256;
  const local = manifest.build.environment === 'local';
  status.dataset.state = matches ? 'match' : 'different';
  status.textContent = matches
    ? local
      ? 'Matches the local PDF — unsigned'
      : 'Matches the published PDF'
    : 'Does not match the latest PDF';
  element('verification-explanation').textContent = matches
    ? local
      ? 'The bytes match the local build manifest. This build has no signed GitHub attestation.'
      : 'The bytes match the published build manifest. Use the command below to verify the signed provenance.'
    : 'This may be an older version or a modified file. A mismatch alone does not establish which. Use the signature check below to look for a signed build of this file.';
  element('checked-filename').textContent = file.name;
  element('actual-hash').textContent = hash;
  element('expected-hash').textContent = manifest.pdf.sha256;
  element('source-fingerprint').textContent = manifest.source.sha256.slice(0, 12);
  element('build-links').hidden = local;
  element('recorded-build').removeAttribute('href');
  if (!local) element('recorded-build').href = manifest.build.url;
  element('verification-command').textContent = [
    `gh attestation verify ${shellQuote(`./${file.name}`)} \\`,
    '  --repo gyng/gyng.github.io \\',
    '  --signer-workflow gyng/gyng.github.io/.github/workflows/cv-pdf.yml \\',
    '  --source-ref refs/heads/gh-pages \\',
    '  --deny-self-hosted-runners',
  ].join('\n');
  copyButton.textContent = 'Copy command';
  result.hidden = false;
}

async function check(loadFile) {
  const current = ++operation;
  result.hidden = true;
  publishedButton.disabled = true;
  status.dataset.state = 'working';
  status.textContent = 'Calculating SHA-256 and loading the published manifest…';
  try {
    if (!globalThis.crypto?.subtle)
      throw new Error('This browser needs a secure HTTPS connection for SHA-256 verification.');
    const file = await loadFile();
    if (!file || file.size > 20 * 1024 * 1024)
      throw new Error('Choose a PDF no larger than 20 MB.');
    const bytes = await file.arrayBuffer();
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-')
      throw new Error('The selected file does not have a PDF header.');
    const [digest, manifest] = await Promise.all([
      crypto.subtle.digest('SHA-256', bytes),
      loadManifest(),
    ]);
    if (current !== operation) return;
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    render(file, hash, manifest);
  } catch (error) {
    if (current !== operation) return;
    status.dataset.state = 'error';
    status.textContent = error.message || 'Verification could not be completed.';
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
  if (file) check(() => file);
});
publishedButton.addEventListener('click', () =>
  check(async () => {
    const response = await fetchFile('../resume.pdf');
    return new File([await response.blob()], 'resume.pdf', { type: 'application/pdf' });
  }),
);
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(element('verification-command').textContent);
    copyButton.textContent = 'Copied';
  } catch {
    copyButton.textContent = 'Select and copy the command above';
  }
});
