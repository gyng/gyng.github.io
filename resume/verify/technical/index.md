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

For the build record, select **Build attestation** at the end of the PDF. This link takes you to the exact GitHub attestation for that file.

The PDF uses a fixed link for its build. After signing, the workflow records the GitHub destination for this link. It does not change the signed PDF. Older PDFs can have a **Build & signatures** link that opens the workflow run instead.

The browser tool compares your file with the current PDF and the [build archive](../../builds/). It identifies matching versions and provides their download and signature links. It does not check signatures. If no build matches, the file may have changed or may not be in the archive. Use the command above to check for a signed build.

## Use a signature bundle

The current build has these files:

- [PDF](../../resume.pdf)
- [Checksum](../../resume.pdf.sha256)
- [Build data (provenance.json)](../../provenance.json)
- [Signature bundle](../../resume.pdf.sigstore.json)

To use the downloaded signature bundle, add `--bundle resume.pdf.sigstore.json` to the command above. To check the build data, change `resume.pdf` to `provenance.json` in that command.

Use files from the same build. These download links always serve the current build. The [build archive](../../builds/) keeps each published signed PDF and its verification files. GitHub Actions adds each successful build automatically. Older files are also saved in [Git history](https://github.com/gyng/gyng.github.io/commits/gh-pages/resume/resume.pdf).

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

## Check the source revision

The **Source commit** at the end of a published PDF identifies the repository revision used to build it. Select the link to open that exact Git commit. The displayed ID is the first 12 characters of the commit ID.

The commit records the Markdown source, renderer, print styles, and dependencies. The commit ID is not the PDF file hash.

The build data records the full source hash, full PDF hash, and source commit. First, check the signature of `provenance.json` as described above.

Then open `resume/index.md` at `build.commit` in [the repository](https://github.com/gyng/gyng.github.io). Download the raw file. On macOS, calculate its hash:

```sh
shasum -a 256 index.md
```

Compare the full result with `source.sha256` in the verified build data. Compare `build.commit` with the linked source commit. Use the full values for verification. Use the short ID as a reference only.

The renderer adds the footer to the PDF without changing the Markdown source.

Different systems or build times can produce different PDF bytes. Each signed build records the exact PDF that it made.

Local preview builds show a short Markdown source hash and an **Unsigned local build** label. They have no signature bundle.
