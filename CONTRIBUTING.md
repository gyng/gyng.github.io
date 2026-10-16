# Building and verifying the CV

Edit `resume/index.md`, then generate its PDF locally:

```sh
npm ci
npm run format:check
npm run lint
npx playwright install chromium
npm run build:cv
npm run verify:cv
npm run test:cv
```

Use `npm run format` to apply formatting. Oxfmt handles source formatting and
Oxlint checks JavaScript; both run in CI. Generated manifests and signature
bundles are excluded from formatting to preserve their recorded bytes.

The result is `resume/resume.pdf`, matching the download links above. To use an
existing Chrome installation instead of downloading Chromium, set `CHROME_PATH`
to its executable when running `npm run build:cv`. Print layout lives in
`scripts/cv-print.css`; the Markdown's explicit page break is preserved.

The PDF ends with a compact SHA-256 fingerprint of the Markdown source. Each build
also writes `resume/resume.pdf.sha256` and `resume/provenance.json`, which record
the full PDF and source hashes. Local builds are explicitly labelled unsigned and
remove any previous generated signature bundle so it cannot be mistaken for a
signature of the new PDF. The fingerprint is inserted by the renderer, keeping
it outside the source it hashes.

After changes are pushed to `gh-pages`, the **Generate CV PDF** workflow renders
the PDF, checks its two-page layout and content, and verifies the recorded hashes.
It uses [GitHub artifact attestations](https://github.com/actions/attest) to sign
both the PDF and manifest, saves `resume/resume.pdf.sigstore.json`, and verifies
both artifacts against the repository, workflow, branch, and source commit before
publishing them. The PDF's **Build & signatures** link opens that exact run, whose
summary contains the attestation links. Signing uses GitHub's OIDC identity and
Sigstore; no manually managed signing key or additional secret is needed.

The workflow commits the PDF and verification files together and explicitly
requests a GitHub Pages rebuild using the existing branch-based configuration.
It needs `contents: write`, `pages: write`, `id-token: write`, and
`attestations: write`; branch protection that blocks bot commits also blocks the
generated update. Generated commits do not retrigger the workflow. If the branch
advances during the build, publishing fails rather than rebasing old artifacts
onto newer source. Run the workflow on the latest commit in that case.

The workflow can also be run manually from the Actions tab. Review the PDF layout
after substantial content changes. See [CV verification](resume/verify/index.md)
for checksum, signature, and source fingerprint checks. Local verification checks
hash consistency; signed provenance is generated and verified only in GitHub Actions.
The verification page also provides a browser file checker. It hashes the PDF on
the visitor's device without uploading it, compares it with the published manifest,
and provides the signature-verification command. A browser checksum match is
labelled separately from cryptographic signature verification.
