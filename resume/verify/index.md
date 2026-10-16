# Verify this CV

<link rel="stylesheet" href="verify.css">
<section id="cv-verifier" aria-labelledby="verifier-title">
  <h2 id="verifier-title">Check a PDF</h2>
  <p>Your file stays on your device. Its SHA-256 checksum is compared with the published build manifest.</p>
  <label id="pdf-dropzone" for="pdf-file">
    <strong>Drop your PDF here, or choose a file</strong>
    <span>PDF files up to 20 MB</span>
    <input id="pdf-file" type="file" accept="application/pdf,.pdf">
  </label>
  <button id="check-published" type="button">Check the published PDF</button>
  <p id="verification-status" role="status" aria-live="polite">Choose a PDF to begin.</p>
  <div id="verification-result" hidden>
    <p id="verification-explanation"></p>
    <dl>
      <dt>Your file</dt><dd id="checked-filename"></dd>
      <dt>Your SHA-256</dt><dd><code id="actual-hash"></code></dd>
      <dt>Published SHA-256</dt><dd><code id="expected-hash"></code></dd>
      <dt>Published source fingerprint</dt><dd><code id="source-fingerprint"></code></dd>
    </dl>
    <p id="build-links" hidden><a id="recorded-build">Build &amp; signatures for the published PDF</a> · <a href="../resume.pdf.sigstore.json">Download signature bundle</a></p>
    <h3>Verify the signature</h3>
    <p id="signature-help">Run this command with the GitHub CLI in the directory containing your PDF. The browser check above does not verify signatures.</p>
    <pre><code id="verification-command"></code></pre>
    <button id="copy-command" type="button">Copy command</button>
  </div>
  <noscript>Enable JavaScript to use the local file checker, or follow the command-line instructions below.</noscript>
</section>
<script src="verify.js" defer></script>

[Download PDF](../resume.pdf) · [SHA-256 checksum](../resume.pdf.sha256) · [Build manifest](../provenance.json) · [Signature bundle](../resume.pdf.sigstore.json)

The last line of the PDF shows a 12-character prefix of the SHA-256 hash of
`resume/index.md`. This identifies the Markdown source. The full source hash and
the finished PDF's full hash are recorded separately in the build manifest.

For a GitHub build, **Build & signatures** in the PDF opens that exact workflow
run. Its summary links to the recorded attestations. Locally generated PDFs are
labelled **unsigned local build** and have no signature bundle.

## Verify the signed PDF

Install the [GitHub CLI](https://cli.github.com/), then run this against the PDF
you downloaded:

```sh
gh attestation verify resume.pdf \
  --repo gyng/gyng.github.io \
  --signer-workflow gyng/gyng.github.io/.github/workflows/cv-pdf.yml \
  --source-ref refs/heads/gh-pages \
  --deny-self-hosted-runners
```

This verifies the PDF's full digest against the signed attestation and checks the
repository, workflow, branch, and GitHub-hosted runner identity. It also works for
an older PDF: GitHub looks up attestations by the file's digest.

To use a downloaded signature bundle, add
`--bundle resume.pdf.sigstore.json`. GitHub builds attest both the PDF and
`provenance.json`; the same command and bundle can verify either file. Downloaded
bundles and manifests must come from the same build as the PDF. The links above
serve the latest published build.

See [GitHub's artifact attestation documentation](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
for the verification model.

## Check the download's checksum

Save the PDF and checksum file in the same directory, then run:

```sh
# macOS
shasum -a 256 --check resume.pdf.sha256

# Linux
sha256sum --check resume.pdf.sha256
```

A successful check prints `resume.pdf: OK`. This confirms the bytes match the
downloaded checksum. Use the signed attestation check above to verify their origin.

## Check the printed source fingerprint

The build manifest records the source commit. Open `resume/index.md` at that
commit in [the repository](https://github.com/gyng/gyng.github.io), download the
**raw** file, and calculate its SHA-256 hash:

```sh
shasum -a 256 index.md
```

Compare the full hash with `source.sha256` in the verified manifest; its first
12 characters should match the PDF's source fingerprint. The compact fingerprint
is a display reference, while verification uses full SHA-256 hashes.

The fingerprint covers the Markdown source. The signed GitHub provenance identifies
the repository commit containing the renderer, print styles, and dependency lockfile.
Rendering on different systems or at different times can produce different PDF
bytes; each signed build records the exact PDF it produced.

[Back to the CV](../)
