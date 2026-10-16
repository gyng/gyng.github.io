# Verify a resume PDF

[Resume](../) · <a href="../resume.pdf" download="Resume - Ng Guoyou.pdf">Download PDF</a>

<link rel="stylesheet" href="verify.css">
<section id="cv-verifier" aria-labelledby="verifier-title">
  <h2 id="verifier-title">Check your PDF</h2>
  <p>Select a PDF file. The tool checks the file on your device. It does not upload your file.</p>
  <label id="pdf-dropzone" for="pdf-file">
    <strong>Drop a PDF here, or select a file</strong>
    <span>Maximum file size: 20 MB</span>
    <input id="pdf-file" type="file" accept="application/pdf,.pdf">
  </label>
  <p id="verification-status" role="status" aria-live="polite"></p>
  <div id="verification-result" hidden>
    <p>File: <strong id="checked-filename"></strong></p>
    <p id="verification-explanation"></p>
    <p id="matched-version-links" hidden><a id="matched-download" download="Resume - Ng Guoyou.pdf">Download this version</a> · <a id="matched-attestation">View attestation</a></p>
  </div>
  <details id="technical-details">
    <summary>Technical details</summary>
    <p>This tool calculates your PDF's SHA-256 hash on your device. It compares the full hash with the current and archived builds. A match identifies a published version. Your file stays on your device. The browser does not check signatures. Use the GitHub CLI command to check the signature and build origin.</p>
    <p><button id="check-published" type="button">Check the published PDF</button></p>
    <div id="verification-data" hidden>
      <dl>
        <dt>File hash (SHA-256)</dt><dd><code id="actual-hash"></code></dd>
        <dt id="expected-hash-label">Published PDF hash (SHA-256)</dt><dd><code id="expected-hash"></code></dd>
        <dt>Published source hash (SHA-256, first 12 characters)</dt><dd><code id="source-fingerprint"></code></dd>
      </dl>
      <p>The source hash identifies the Markdown file used to build the PDF. It includes text, formatting, and links. It is not the PDF file hash.</p>
      <p id="build-links" hidden><a id="recorded-build">Build and signatures</a> · <a id="signature-bundle" href="../resume.pdf.sigstore.json">Download signature bundle</a></p>
      <h3>Check the signature</h3>
      <p id="signature-help">Install the GitHub CLI. Run this command in the folder that contains your PDF. This page does not verify signatures.</p>
      <pre><code id="verification-command"></code></pre>
      <button id="copy-command" type="button">Copy command</button>
    </div>
    <p><a href="../builds/">Build history</a> · <a href="technical/">Read the verification instructions</a></p>
  </details>
  <noscript>Enable JavaScript to use this tool. You can also use the verification instructions.</noscript>
</section>
<script src="verify.js" defer></script>
