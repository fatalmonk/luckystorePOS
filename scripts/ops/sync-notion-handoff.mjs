#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const NOTION_API_VERSION = '2022-06-28';
const MARKER = 'AUTO-SYNCED REPOSITORY CONTEXT — managed by GitHub Actions';
const MAX_CHILDREN = 100;

const token = process.env.NOTION_API_KEY;
const pageId = process.env.NOTION_HANDOFF_PAGE_ID;

if (!token || !pageId) {
  console.error('Missing NOTION_API_KEY or NOTION_HANDOFF_PAGE_ID.');
  process.exit(1);
}

const source = await readFile('docs/AI_HANDOFF.md', 'utf8');

function richText(content, annotations = {}) {
  return [{ type: 'text', text: { content }, annotations }];
}

function inline(text) {
  const parts = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  for (const match of text.matchAll(regex)) {
    if (match.index > last) parts.push(...richText(text.slice(last, match.index)));
    const value = match[0];
    if (value.startsWith('`')) parts.push(...richText(value.slice(1, -1), { code: true }));
    else parts.push(...richText(value.slice(2, -2), { bold: true }));
    last = match.index + value.length;
  }
  if (last < text.length) parts.push(...richText(text.slice(last)));
  return parts.length ? parts : richText(' ');
}

function markdownToBlocks(markdown) {
  const blocks = [
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '🔄' },
        rich_text: richText(MARKER),
      },
    },
  ];

  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (!line || line === '---') continue;
    if (line.startsWith('# ')) continue; // Notion page already has its own title.

    if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: inline(line.slice(3)) } });
    } else if (line.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: inline(line.slice(4)) } });
    } else if (line.startsWith('- ')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: inline(line.slice(2)) } });
    } else if (line.startsWith('> ')) {
      blocks.push({ object: 'block', type: 'quote', quote: { rich_text: inline(line.slice(2)) } });
    } else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: inline(line) } });
    }
  }

  return blocks;
}

async function notion(path, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Notion ${response.status}: ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

async function listChildren() {
  const children = [];
  let cursor;
  do {
    const query = new URLSearchParams({ page_size: '100' });
    if (cursor) query.set('start_cursor', cursor);
    const data = await notion(`/blocks/${pageId}/children?${query}`);
    children.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return children;
}

async function deleteManagedSection(children) {
  const markerIndex = children.findIndex((block) => {
    if (block.type !== 'callout') return false;
    return (block.callout?.rich_text ?? []).some((part) => part.plain_text === MARKER);
  });

  if (markerIndex === -1) return;
  for (const block of children.slice(markerIndex)) {
    await notion(`/blocks/${block.id}`, { method: 'DELETE' });
  }
}

async function appendBlocks(blocks) {
  for (let i = 0; i < blocks.length; i += MAX_CHILDREN) {
    await notion(`/blocks/${pageId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children: blocks.slice(i, i + MAX_CHILDREN) }),
    });
  }
}

const children = await listChildren();
await deleteManagedSection(children);
await appendBlocks(markdownToBlocks(source));
console.log(`Synced docs/AI_HANDOFF.md to Notion page ${pageId}.`);
