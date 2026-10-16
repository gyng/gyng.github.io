import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { marked } from 'marked';
import { chromium } from 'playwright';

test('browser CV verification', async (t) => {
  const root = new URL('../', import.meta.url);
  const pdf = await readFile(new URL('resume/resume.pdf', root));
  const original = JSON.parse(await readFile(new URL('resume/provenance.json', root), 'utf8'));
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CV verification</title><body>${marked.parse(await readFile(new URL('resume/verify/index.md', root), 'utf8'))}</body></html>`;
  let manifest;
  let manifestStatus;
  let methods;
  let history;
  let historicalManifest;
  let historyStatus;
  const assets = new Map([
    ['/resume/verify/', [html, 'text/html; charset=utf-8']],
    [
      '/resume/verify/verify.js',
      [await readFile(new URL('resume/verify/verify.js', root)), 'text/javascript'],
    ],
    [
      '/resume/verify/verify.css',
      [await readFile(new URL('resume/verify/verify.css', root)), 'text/css'],
    ],
    ['/resume/resume.pdf', [pdf, 'application/pdf']],
  ]);
  const server = createServer((request, response) => {
    methods.push(request.method);
    if (request.url === '/resume/provenance.json') {
      response.writeHead(manifestStatus, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(manifest));
      return;
    }
    if (request.url === '/resume/builds/index.json') {
      response.writeHead(historyStatus, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(history));
      return;
    }
    if (request.url === '/resume/builds/100-1/provenance.json') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(historicalManifest));
      return;
    }
    const asset = assets.get(request.url);
    response.writeHead(asset ? 200 : 404, { 'Content-Type': asset?.[1] ?? 'text/plain' });
    response.end(asset?.[0] ?? 'Not found');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
    const base = `http://127.0.0.1:${server.address().port}`;
    const run = async (name, check) =>
      t.test(name, async () => {
        manifest = structuredClone(original);
        manifest.build = { environment: 'local', commit: null, url: null };
        manifestStatus = 200;
        history = { schemaVersion: 1, builds: [] };
        historicalManifest = null;
        historyStatus = 200;
        methods = [];
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        try {
          await page.goto(`${base}/resume/verify/`);
          await check(page);
          assert.deepEqual(errors, []);
          assert(
            methods.every((method) => method === 'GET'),
            'Files must not be uploaded',
          );
        } finally {
          await page.close();
        }
      });
    const choose = (page, buffer = pdf, name = 'resume.pdf') =>
      page.locator('#pdf-file').setInputFiles({ name, mimeType: 'application/pdf', buffer });
    const state = (page, expected) =>
      page.waitForFunction(
        (value) => document.getElementById('verification-status').dataset.state === value,
        expected,
      );

    await run('matching local PDF is explicitly unsigned and works on mobile', async (page) => {
      assert.equal(
        await page.getByRole('link', { name: 'Resume', exact: true }).getAttribute('href'),
        '../',
      );
      assert.equal(await page.locator('#technical-details').getAttribute('open'), null);
      assert.equal(await page.locator('#check-published').isVisible(), false);
      await choose(page);
      await state(page, 'match');
      assert.match(await page.locator('#verification-status').innerText(), /unsigned/);
      assert.equal(await page.locator('#technical-details').getAttribute('open'), null);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('#technical-details summary').click();
      assert.equal(await page.locator('#actual-hash').innerText(), original.pdf.sha256);
      assert.equal(
        await page.locator('#source-fingerprint').innerText(),
        original.source.sha256.slice(0, 12),
      );
      assert.equal(await page.locator('#build-links').isVisible(), false);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    });
    await run(
      'GitHub build exposes the exact run without claiming signature verification',
      async (page) => {
        manifest.build = {
          environment: 'github-actions',
          commit: 'a'.repeat(40),
          url: 'https://github.com/gyng/gyng.github.io/actions/runs/123/attempts/1',
        };
        await choose(page);
        await state(page, 'match');
        await page.locator('#technical-details summary').click();
        assert.equal(
          await page.locator('#recorded-build').getAttribute('href'),
          manifest.build.url,
        );
        assert.match(
          await page.locator('#signature-help').innerText(),
          /does not verify signatures/,
        );
      },
    );
    await run('changed PDF reports a mismatch without declaring tampering', async (page) => {
      await choose(page, Buffer.concat([pdf, Buffer.from('\nmodified')]));
      await state(page, 'different');
      assert.match(
        await page.locator('#verification-explanation').innerText(),
        /may have changed, or its build may not be in the archive/,
      );
    });
    const archivedPdf = Buffer.from('%PDF-1.4\narchived build');
    const prepareHistory = () => {
      historicalManifest = structuredClone(original);
      historicalManifest.pdf.sha256 = createHash('sha256').update(archivedPdf).digest('hex');
      historicalManifest.build = {
        environment: 'github-actions',
        commit: 'b'.repeat(40),
        url: 'https://github.com/gyng/gyng.github.io/actions/runs/100/attempts/1',
      };
      history.builds.push({
        id: '100-1',
        pdfSha256: historicalManifest.pdf.sha256,
        sourceCommit: historicalManifest.build.commit,
        attestationUrl: 'https://github.com/gyng/gyng.github.io/attestations/200',
      });
    };
    await run(
      'an older published PDF has its own download, build and signature links',
      async (page) => {
        prepareHistory();
        await choose(page, archivedPdf);
        await state(page, 'older');
        assert.match(
          await page.locator('#verification-status').innerText(),
          /matches an earlier resume/,
        );
        assert.equal(
          await page.locator('#matched-download').getAttribute('href'),
          '../builds/100-1/resume.pdf',
        );
        assert.equal(
          await page.locator('#matched-attestation').getAttribute('href'),
          history.builds[0].attestationUrl,
        );
        await page.locator('#technical-details summary').click();
        assert.equal(
          await page.locator('#signature-bundle').getAttribute('href'),
          '../builds/100-1/resume.pdf.sigstore.json',
        );
        assert.equal(
          await page.locator('#recorded-build').getAttribute('href'),
          historicalManifest.build.url,
        );
        assert.equal(
          await page.locator('#expected-hash').innerText(),
          historicalManifest.pdf.sha256,
        );
        await choose(page);
        await state(page, 'match');
        assert.equal(await page.locator('#matched-version-links').isVisible(), false);
      },
    );
    await run('history fetch failure does not report an unknown PDF', async (page) => {
      historyStatus = 503;
      await choose(page, archivedPdf);
      await state(page, 'error');
    });
    await run('a history entry cannot point to a different PDF', async (page) => {
      prepareHistory();
      historicalManifest.pdf.sha256 = original.pdf.sha256;
      await choose(page, archivedPdf);
      await state(page, 'error');
    });
    await run('history links cannot use an unexpected destination', async (page) => {
      prepareHistory();
      history.builds[0].attestationUrl = 'javascript:alert(1)';
      await choose(page, archivedPdf);
      await state(page, 'error');
    });
    await run('non-PDF input is rejected', async (page) => {
      await choose(page, Buffer.from('not a PDF'));
      await state(page, 'error');
      assert.match(
        await page.locator('#verification-status').innerText(),
        /Cannot read this file as a PDF/,
      );
      assert.equal(await page.locator('#verification-result').isVisible(), false);
    });
    await run('manifest fetch failure is reported', async (page) => {
      manifestStatus = 503;
      await choose(page);
      await state(page, 'error');
      assert.match(await page.locator('#verification-status').innerText(), /Cannot get/);
    });
    await run('unexpected build URL is rejected', async (page) => {
      manifest.build = { environment: 'github-actions', url: 'javascript:alert(1)' };
      await choose(page);
      await state(page, 'error');
      assert.match(await page.locator('#verification-status').innerText(), /build link/);
    });
    await run('filenames remain text and are shell-quoted in commands', async (page) => {
      const name = "cv'$(echo test)<img>.pdf";
      await choose(page, pdf, name);
      await state(page, 'match');
      assert.equal(await page.locator('#checked-filename').innerText(), name);
      assert.equal(await page.locator('#checked-filename img').count(), 0);
      await page.locator('#technical-details summary').click();
      assert(
        (await page.locator('#verification-command').innerText()).startsWith(
          "gh attestation verify './cv'\\''$(echo test)<img>.pdf'",
        ),
      );
    });
    await run('published PDF can be checked without choosing a file', async (page) => {
      await choose(page, Buffer.concat([pdf, Buffer.from('\nchanged')]), 'changed.pdf');
      await state(page, 'different');
      assert.equal(await page.locator('#check-published').isVisible(), false);
      await page.locator('#technical-details summary').click();
      await page.locator('#check-published').click();
      await state(page, 'match');
      assert.equal(await page.locator('#checked-filename').innerText(), 'resume.pdf');
      assert.equal(await page.locator('#pdf-file').inputValue(), '');
    });
    await run('drag and drop checks the dropped PDF', async (page) => {
      await page.evaluate(() => {
        const transfer = new DataTransfer();
        transfer.items.add(
          new File(['%PDF-1.4\nolder version'], 'older.pdf', { type: 'application/pdf' }),
        );
        document
          .getElementById('pdf-dropzone')
          .dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
      });
      await state(page, 'different');
      assert.equal(await page.locator('#checked-filename').innerText(), 'older.pdf');
      assert.equal(
        await page.locator('#pdf-file').evaluate((input) => input.files[0].name),
        'older.pdf',
      );
    });
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
