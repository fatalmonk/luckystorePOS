import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { auditMarkdownFiles } from './audit-markdown.mjs';

async function withFixture(files, run) {
  const root = await mkdtemp(path.join(tmpdir(), 'lucky-store-docs-'));

  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(root, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }

    await run(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

test('reports valid Markdown without findings', async () => {
  await withFixture(
    {
      'README.md': '# Project\n\nSee the [guide](docs/guide.md).\n',
      'docs/guide.md': '# Guide\n',
    },
    async (root) => {
      const report = await auditMarkdownFiles(root, ['README.md', 'docs/guide.md']);

      assert.equal(report.summary.errors, 0);
      assert.equal(report.summary.warnings, 0);
      assert.equal(report.files.length, 2);
    },
  );
});

test('reports missing and multiple H1 headings while ignoring fenced examples', async () => {
  await withFixture(
    {
      'docs/missing.md': 'No heading here.\n',
      'docs/multiple.md': '# First\n\n# Second\n',
      'docs/fenced.md': '# Guide\n\n```markdown\n# Example only\n```\n',
    },
    async (root) => {
      const report = await auditMarkdownFiles(root, [
        'docs/fenced.md',
        'docs/missing.md',
        'docs/multiple.md',
      ]);
      const rules = report.findings.map((finding) => finding.rule);

      assert.deepEqual(rules, ['heading/missing-h1', 'heading/multiple-h1']);
      assert.equal(report.summary.errors, 2);
    },
  );
});

test('reports broken relative links but ignores anchors, external URLs, code spans, and line suffixes', async () => {
  await withFixture(
    {
      'docs/guide.md': [
        '# Guide',
        '',
        '[Missing](missing.md)',
        '[Source line](source.ts:21)',
        '[Anchor](#guide)',
        '[External](https://example.com)',
        '`[Code sample](not-a-link.md)`',
        '',
      ].join('\n'),
      'docs/source.ts': 'export const value = true;\n',
    },
    async (root) => {
      const report = await auditMarkdownFiles(root, ['docs/guide.md']);

      assert.equal(report.summary.errors, 1);
      assert.equal(report.findings[0].rule, 'link/missing-target');
      assert.equal(report.findings[0].target, 'missing.md');
    },
  );
});

test('reports unexpected root Markdown without flagging approved entry points', async () => {
  await withFixture(
    {
      'README.md': '# Project\n',
      'context.md': '[Project]\nStack: Next.js\n',
      'tracker.md': '# Tracker\n',
    },
    async (root) => {
      const report = await auditMarkdownFiles(root, ['README.md', 'context.md', 'tracker.md']);

      assert.equal(report.summary.errors, 0);
      assert.equal(report.summary.warnings, 1);
      assert.equal(report.findings[0].rule, 'location/unexpected-root-markdown');
      assert.equal(report.findings[0].path, 'tracker.md');
    },
  );
});

test('handles links with balanced parentheses, spaces in angle brackets, encoded paths, images, and titles', async () => {
  await withFixture(
    {
      'docs/guide.md': [
        '# Complex Links',
        '',
        '[Route group](app/(english)/page.tsx)',
        '[Spaced asset](<assets/photo (1).png>)',
        '[Encoded](sub%20dir/note.md)',
        '![Screenshot](assets/screen.png)',
        '[With Title](intro.md "Overview")',
        '[Repository Root](/docs/intro.md)',
        '',
      ].join('\n'),
      'docs/app/(english)/page.tsx': 'export default function Page() {}\n',
      'docs/assets/photo (1).png': 'binary\n',
      'docs/assets/screen.png': 'binary\n',
      'docs/sub dir/note.md': '# Note\n',
      'docs/intro.md': '# Intro\n',
    },
    async (root) => {
      const report = await auditMarkdownFiles(root, [
        'docs/guide.md',
        'docs/sub dir/note.md',
        'docs/intro.md',
      ]);

      assert.equal(report.summary.errors, 0);
      assert.equal(report.summary.warnings, 0);
    },
  );
});

test('handles machine-specific absolute paths by verifying existence and issuing non-portable warnings', async () => {
  await withFixture(
    {
      'docs/audit.md': [
        '# Audit',
        '',
        'Target will be replaced dynamically.',
        '',
      ].join('\n'),
      'src/target.ts': 'export const ok = true;\n',
    },
    async (root) => {
      // Write machine-specific absolute path referencing a file in root
      const machinePath = path.join(root, 'src/target.ts');
      const content = `# Audit\n\n[Evidence](${machinePath}:42)\n[Missing](${machinePath}-nonexistent)\n`;
      const docPath = path.join(root, 'docs/audit.md');
      await writeFile(docPath, content);

      const report = await auditMarkdownFiles(root, ['docs/audit.md']);

      const warnings = report.findings.filter((f) => f.severity === 'warning');
      const errors = report.findings.filter((f) => f.severity === 'error');

      assert.equal(warnings.length, 1);
      assert.equal(warnings[0].rule, 'link/non-portable-path');

      assert.equal(errors.length, 1);
      assert.equal(errors[0].rule, 'link/missing-target');
    },
  );
});

