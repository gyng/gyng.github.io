# Resume verification instructions

[Resume](../../) · [Download PDF](../../resume.pdf) · [Verify resume PDF](../)

## Check the signature

Install the [GitHub CLI](https://cli.github.com/). Open a terminal in the folder that contains your PDF. Run this command:

```sh
gh attestation verify resume.pdf \
  --repo gyng/gyng.github.io \
  --signer-workflow gyng/gyng.github.io/.github/workflows/cv-pdf.yml \
  --source-ref refs/heads/gh-pages \
  --deny-self-hosted-runners
```

Change `resume.pdf` if your file has a different name.

This command checks the PDF against its signed build record. It checks the repository, workflow, branch, and GitHub runner identity. It also works for older signed PDFs. GitHub finds the build record from the full file hash.

For the build record, select **Build & signatures** at the end of the PDF. This link opens the GitHub Actions run that made the file. The run summary links to the signatures.

The browser tool compares your file with the current PDF. It does not check signatures. A different file can be an older version or a modified file. Use the command above to check for a signed build.

## Use a signature bundle

The current build has these files:

- [PDF](../../resume.pdf)
- [Checksum](../../resume.pdf.sha256)
- [Build data (provenance.json)](../../provenance.json)
- [Signature bundle](../../resume.pdf.sigstore.json)

To use the downloaded signature bundle, add `--bundle resume.pdf.sigstore.json` to the command above. To check the build data, change `resume.pdf` to `provenance.json` in that command.

Use files from the same build. These download links always serve the current build. Each published build is also saved in [Git history](https://github.com/gyng/gyng.github.io/commits/gh-pages/resume/resume.pdf).

See [GitHub's verification instructions](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) for more information.

## Check the file hash

Save the PDF and checksum in the same folder. Use this command on macOS:

```sh
shasum -a 256 --check resume.pdf.sha256
```

Use this command on Linux:

```sh
sha256sum --check resume.pdf.sha256
```

A successful check shows `resume.pdf: OK`. This means that the file matches the downloaded checksum. Use the signature check to verify the build origin.

## Check the source hash

The **Source hash** at the end of the PDF identifies the Markdown file used to build it. It includes text, formatting, and links. It shows the first 12 characters of the source's SHA-256 hash. It is not the PDF file hash.

In a published PDF, select **Source hash** to open the Markdown file at the Git commit used for that build. The displayed hash is the Markdown file hash, not the Git commit hash.

The build data records the full source hash, full PDF hash, and source commit. First, check the signature of `provenance.json` as described above.

Then open `resume/index.md` at `build.commit` in [the repository](https://github.com/gyng/gyng.github.io). Download the raw file. On macOS, calculate its hash:

```sh
shasum -a 256 index.md
```

Compare the full result with `source.sha256` in the verified build data. The first 12 characters must match the printed source hash. Use the full hashes for verification. Use the short hash as a reference only.

The renderer adds the hash to the PDF after it reads the source. Thus, the printed hash does not change the source hash.

The source commit also records the renderer, print styles, and dependencies. Different systems or build times can produce different PDF bytes. Each signed build records the exact PDF that it made.

Local preview builds have an **Unsigned local build** label. They have no signature bundle.
