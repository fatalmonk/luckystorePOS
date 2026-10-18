#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);

const ALLOWED_ROOT_MARKDOWN = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'CONTEXT-MAP.md',
  'CONTEXT.md',
  'context.md',
  'README.md',
]);

const IGNORED_PREFIXES = [
  '.agents/',
  '.agents_archive/',
  '.ai-dev-kit/',
  '.gemini/',
  '.git/',
  '.github/',
  '.hermes/',
  '.next/',
  '.turbo/',
  '.venv/',
  '.venv-legacy/',
  '.worktrees/',
  '_archive/',
  'build/',
  'coverage/',
  'dist/',
  'node_modules/',
  'vendor/',
];

function isIgnored(relativePath) {
  return IGNORED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function isExternalTarget(target) {
  return /^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(target);
}

function cleanLinkTarget(rawTarget) {
  const target = rawTarget.trim().replace(/^<|>$/g, '');
  return target.split('#', 1)[0].split('?', 1)[0];
}

function stripNonProseMarkdown(content) {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '');
}

function extractLinks(content) {
  const links = [];
  const text = stripNonProseMarkdown(content);
  const openPattern = /!?\[(?:\\.|[^\]\\])*\]\(/g;

  for (const match of text.matchAll(openPattern)) {
    const startIdx = match.index + match[0].length;
    let idx = startIdx;
    let target = '';

    while (idx < text.length && (text[idx] === ' ' || text[idx] === '\t')) {
      idx++;
    }

    if (idx < text.length && text[idx] === '<') {
      idx++;
      const angleStart = idx;
      while (idx < text.length && text[idx] !== '>' && text[idx] !== '\n') {
        if (text[idx] === '\\') idx++;
        idx++;
      }
      if (idx < text.length && text[idx] === '>') {
        target = text.slice(angleStart, idx);
      }
    } else {
      let parenDepth = 1;
      const bareStart = idx;
      while (idx < text.length && parenDepth > 0) {
        const char = text[idx];
        if (char === '\\') {
          idx += 2;
          continue;
        }
        if ((char === ' ' || char === '\t' || char === '\n') && parenDepth === 1) {
          target = text.slice(bareStart, idx);
          break;
        }
        if (char === '(') {
          parenDepth++;
        } else if (char === ')') {
          parenDepth--;
          if (parenDepth === 0) {
            target = text.slice(bareStart, idx);
            break;
          }
        }
        idx++;
      }
      if (parenDepth > 0 && !target) {
        target = text.slice(bareStart, idx);
      }
    }

    const cleaned = cleanLinkTarget(target);
    if (cleaned && !isExternalTarget(cleaned)) {
      links.push(cleaned);
    }
  }

  return links;
}

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function auditMarkdownFiles(root, inputPaths) {
  const files = [...new Set(inputPaths)]
    .map((entry) => entry.replaceAll('\\', '/'))
    .filter((entry) => entry.endsWith('.md') && !isIgnored(entry))
    .sort();
  const findings = [];
  const manifest = [];

  for (const relativePath of files) {
    const absolutePath = path.join(root, relativePath);
    if (!(await exists(absolutePath))) {
      continue;
    }
    const content = await readFile(absolutePath, 'utf8');
    const proseContent = stripNonProseMarkdown(content);
    const headings = [...proseContent.matchAll(/^(#{1,6})\s+(.+?)\s*$/gm)];
    const h1Headings = headings.filter((match) => match[1] === '#');

    manifest.push({
      path: relativePath,
      title: h1Headings[0]?.[2] ?? headings[0]?.[2] ?? null,
      h1Count: h1Headings.length,
      lineCount: content.split('\n').length,
    });

    const isOperationalStateFile = relativePath === 'context.md' || relativePath === 'CONTEXT.md';

    if (!isOperationalStateFile) {
      if (h1Headings.length === 0) {
        findings.push({
          severity: 'error',
          rule: 'heading/missing-h1',
          path: relativePath,
          message: 'Document must contain exactly one H1 heading.',
        });
      } else if (h1Headings.length > 1) {
        findings.push({
          severity: 'error',
          rule: 'heading/multiple-h1',
          path: relativePath,
          message: `Document contains ${h1Headings.length} H1 headings.`,
        });
      }
    }

    if (!relativePath.includes('/') && !ALLOWED_ROOT_MARKDOWN.has(relativePath)) {
      findings.push({
        severity: 'warning',
        rule: 'location/unexpected-root-markdown',
        path: relativePath,
        message: 'Move non-entry-point Markdown out of the repository root.',
      });
    }

    for (const target of extractLinks(content)) {
      let decodedTarget = target;
      try {
        decodedTarget = decodeURIComponent(target);
      } catch {
        // Keep undecoded if malformed URI sequence
      }

      const targetWithoutLine = decodedTarget.replace(/:(?:\d+)(?::\d+)?$/, '');
      let resolvedTarget;
      let isNonPortable = false;

      if (targetWithoutLine.startsWith(root)) {
        isNonPortable = true;
        resolvedTarget = targetWithoutLine;
      } else {
        const isMachinePath = /^(?:\/Users\/|\/home\/|\/private\/|\/var\/|[A-Za-z]:[\\/])/.test(targetWithoutLine);
        if (isMachinePath) {
          isNonPortable = true;
          const marker = `/${path.basename(root)}/`;
          const idx = targetWithoutLine.indexOf(marker);
          if (idx !== -1) {
            resolvedTarget = path.join(root, targetWithoutLine.slice(idx + marker.length));
          } else {
            resolvedTarget = targetWithoutLine;
          }
        } else if (targetWithoutLine.startsWith('/')) {
          resolvedTarget = path.join(root, targetWithoutLine.slice(1));
        } else {
          resolvedTarget = path.resolve(path.dirname(absolutePath), targetWithoutLine);
        }
      }

      const targetExists = await exists(resolvedTarget);

      if (!targetExists) {
        findings.push({
          severity: 'error',
          rule: 'link/missing-target',
          path: relativePath,
          target,
          message: `Relative link target does not exist: ${target}`,
        });
      } else if (isNonPortable) {
        findings.push({
          severity: 'warning',
          rule: 'link/non-portable-path',
          path: relativePath,
          target,
          message: `Link uses machine-specific absolute path: ${target}`,
        });
      }
    }
  }

  findings.sort((left, right) =>
    left.path.localeCompare(right.path) || left.rule.localeCompare(right.rule) || (left.target || '').localeCompare(right.target || ''),
  );

  return {
    files: manifest,
    findings,
    summary: {
      files: manifest.length,
      errors: findings.filter((finding) => finding.severity === 'error').length,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
    },
  };
}

async function listTrackedMarkdown(root) {
  const { stdout } = await execFileAsync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'],
    { cwd: root, maxBuffer: 10 * 1024 * 1024 },
  );

  return stdout.split('\n').filter(Boolean);
}

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    reportOnly: argv.includes('--report-only'),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const files = await listTrackedMarkdown(root);
  const report = await auditMarkdownFiles(root, files);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `Markdown audit: ${report.summary.files} files, ${report.summary.errors} errors, ${report.summary.warnings} warnings`,
    );
    for (const finding of report.findings) {
      const target = finding.target ? ` (${finding.target})` : '';
      console.log(
        `${finding.severity.toUpperCase()} ${finding.path}: ${finding.rule}${target}`,
      );
    }
  }

  if (!options.reportOnly && report.summary.errors > 0) {
    process.exitCode = 1;
  }
}

const isEntryPoint =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntryPoint) {
  await main();
}
