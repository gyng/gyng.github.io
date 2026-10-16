import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const markdown = await readFile(new URL('resume/index.md', root), 'utf8');
const styles = await readFile(new URL('scripts/cv-print.css', root), 'utf8');
const output = new URL('resume/resume.pdf', root);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceHash = sha256(markdown);
const inActions = process.env.GITHUB_ACTIONS === 'true';
const repository = process.env.GITHUB_REPOSITORY;
const commit = process.env.GITHUB_SHA;
const runId = process.env.GITHUB_RUN_ID;
const attempt = process.env.GITHUB_RUN_ATTEMPT;

if (
  inActions &&
  (repository !== 'gyng/gyng.github.io' ||
    !/^[a-f0-9]{40}$/.test(commit ?? '') ||
    !/^\d+$/.test(runId ?? '') ||
    !/^\d+$/.test(attempt ?? ''))
) {
  throw new Error('Missing or unexpected GitHub build identity.');
}

const buildUrl = inActions
  ? `https://github.com/${repository}/actions/runs/${runId}/attempts/${attempt}`
  : null;
const verificationUrl = 'https://gyng.github.io/resume/verify/';
const sourceLabel = `Source hash: <code>${sourceHash.slice(0, 12)}</code>`;
const sourceReference = inActions
  ? `<a href="https://github.com/${repository}/blob/${commit}/resume/index.md">${sourceLabel}</a>`
  : sourceLabel;
const footer = `<p class="cv-provenance">${sourceReference} ·
<a href="${verificationUrl}">Verify resume PDF</a> ·
${inActions ? `<a href="${buildUrl}">Build &amp; signatures</a>` : 'Unsigned local build'}</p>`;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
});

try {
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Ng Guoyou — Resume</title>
<base href="https://gyng.github.io/resume/">
<style>${styles}</style></head><body>${marked.parse(markdown)}${footer}</body></html>`,
    {
      waitUntil: 'networkidle',
    },
  );
  await page.evaluate(() => document.fonts.ready);
  await mkdir(new URL('resume/', root), { recursive: true });
  await page.pdf({
    path: fileURLToPath(output),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,
    outline: true,
  });
  // Detached checksums avoid making the PDF depend on its own digest.
  const pdf = await readFile(output);
  const pdfHash = sha256(pdf);
  await writeFile(new URL('resume/resume.pdf.sha256', root), `${pdfHash}  resume.pdf\n`);
  await writeFile(
    new URL('resume/provenance.json', root),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        pdf: { file: 'resume.pdf', sha256: pdfHash, bytes: pdf.length },
        source: { file: 'resume/index.md', sha256: sourceHash },
        build: {
          environment: inActions ? 'github-actions' : 'local',
          commit: inActions ? commit : null,
          url: buildUrl,
        },
      },
      null,
      2,
    )}\n`,
  );
  // A fresh PDF must never retain a previous build's signature bundle.
  // GitHub Actions creates a new bundle only after rendering and checking it.
  await rm(new URL('resume/resume.pdf.sigstore.json', root), { force: true });
  console.log(`Generated ${fileURLToPath(output)}`);
} finally {
  await browser.close();
}
