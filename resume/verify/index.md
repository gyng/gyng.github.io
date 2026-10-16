# Verify a resume PDF

[Resume](../) · [Download PDF](../resume.pdf)

<link rel="stylesheet" href="verify.css">
<section id="cv-verifier" aria-labelledby="verifier-title">
  <h2 id="verifier-title">Check your PDF</h2>
  <p>Select a PDF file. The tool checks the file on your device. It does not upload your file.</p>
  <label id="pdf-dropzone" for="pdf-file">
    <strong>Drop a PDF here, or select a file</strong>
    <span>Maximum file size: 20 MB</span>
    <input id="pdf-file" type="file" accept="application/pdf,.pdf">
  </label>
  <p id="verification-status" role="status" aria-live="polite">Select a PDF to start.</p>
  <div id="verification-result" hidden>
    <p>File: <strong id="checked-filename"></strong></p>
    <p id="verification-explanation"></p>
  </div>
  <details id="technical-details">
    <summary>Technical details</summary>
    <p><button id="check-published" type="button">Check the published PDF</button></p>
    <div id="verification-data" hidden>
      <dl>
        <dt>File hash (SHA-256)</dt><dd><code id="actual-hash"></code></dd>
        <dt>Current PDF hash (SHA-256)</dt><dd><code id="expected-hash"></code></dd>
        <dt>Current source hash (SHA-256, first 12 characters)</dt><dd><code id="source-fingerprint"></code></dd>
      </dl>
      <p>The source hash identifies the Markdown file used to build the PDF. It includes text, formatting, and links. It is not the PDF file hash.</p>
      <p id="build-links" hidden><a id="recorded-build">Current build and signatures</a> · <a href="../resume.pdf.sigstore.json">Download signature bundle</a></p>
      <h3>Check the signature</h3>
      <p id="signature-help">Install the GitHub CLI. Run this command in the folder that contains your PDF. This page does not verify signatures.</p>
      <pre><code id="verification-command"></code></pre>
      <button id="copy-command" type="button">Copy command</button>
    </div>
    <p><a href="technical/">Read the verification instructions</a></p>
  </details>
  <noscript>Enable JavaScript to use this tool. You can also use the verification instructions.</noscript>
</section>
<script src="verify.js" defer></script>
