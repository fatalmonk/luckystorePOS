import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = Number(process.env.STOREFRONT_HTML_CONTRACT_PORT || 3029);
const BASE_URL = `http://localhost:${PORT}`;
const require = createRequire(new URL('../package.json', import.meta.url));
const STOREFRONT_DIR = fileURLToPath(new URL('../', import.meta.url));
const NEXT_BIN = require.resolve('next/dist/bin/next');
const PRODUCT_PATH = '/product/aarong-standardized-milk-500-ml--3d7c76cf';
const PRODUCT_CANONICAL = `https://www.luckystore1947.com${PRODUCT_PATH}`;
const PRODUCT_HTML_BUDGET = 300_000;
const HOME_HTML_BUDGET = 750_000;
const MAX_INLINE_STYLE_BYTES = 2_000;

let server;
let serverOutput = '';

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match?.[1] ?? match?.[2] ?? null;
}

function getTags(html, name) {
  return Array.from(html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi')), (match) => match[0]);
}

function decodeHtmlText(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, value) => {
    if (value[0] === '#') {
      const codePoint = value[1].toLowerCase() === 'x'
        ? Number.parseInt(value.slice(2), 16)
        : Number.parseInt(value.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[value.toLowerCase()];
  });
}

function effectiveBodyContent(html) {
  const { body } = splitDocument(html);
  const root = { type: 'root', children: [], parent: null };
  const stack = [root];
  const nodesById = new Map();
  const tokens = body.match(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<![^>]*>|<[^>]+>|[^<]+/gi) || [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

  for (const token of tokens) {
    if (token.startsWith('<!--')) {
      stack.at(-1).children.push({ type: 'comment', data: token.slice(4, -3), parent: stack.at(-1) });
      continue;
    }
    if (/^<(?:script|style)\b/i.test(token) || /^<!/i.test(token)) continue;
    if (token[0] !== '<') {
      stack.at(-1).children.push({ type: 'text', data: token, parent: stack.at(-1) });
      continue;
    }

    const closing = token.match(/^<\/\s*([a-z][\w:-]*)\s*>$/i);
    if (closing) {
      const tagName = closing[1].toLowerCase();
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].tag === tagName) {
          stack.length = index;
          break;
        }
      }
      continue;
    }

    const opening = token.match(/^<\s*([a-z][\w:-]*)\b/i);
    if (!opening) continue;
    const tagName = opening[1].toLowerCase();
    const element = {
      type: 'element',
      tag: tagName,
      id: getAttribute(token, 'id'),
      className: getAttribute(token, 'class') || '',
      hidden: /\shidden(?:\s|=|\/?>)/i.test(token)
        || getAttribute(token, 'aria-hidden')?.trim().toLowerCase() === 'true',
      href: tagName === 'a' ? getAttribute(token, 'href') : null,
      children: [],
      parent: stack.at(-1),
    };
    stack.at(-1).children.push(element);
    if (element.id && !nodesById.has(element.id)) nodesById.set(element.id, element);
    if (!voidTags.has(tagName) && !/\/\s*>$/.test(token)) stack.push(element);
  }

  const isAttached = (node) => {
    for (let current = node; current; current = current.parent) {
      if (current === root) return true;
    }
    return false;
  };
  const removeNode = (node) => {
    if (!node?.parent) return;
    const index = node.parent.children.indexOf(node);
    if (index >= 0) node.parent.children.splice(index, 1);
    node.parent = null;
  };
  const operations = [];
  for (const script of body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    for (const operation of script[1].matchAll(/\$(RS|RC)\(\s*["']([BPS]:[\da-z]+)["']\s*,\s*["']([BPS]:[\da-z]+)["']\s*\)/gi)) {
      operations.push({ kind: operation[1].toUpperCase(), first: operation[2], second: operation[3] });
    }
  }

  for (const operation of operations) {
    const sourceId = operation.kind === 'RS' ? operation.first : operation.second;
    const source = nodesById.get(sourceId);
    if (!source || !isAttached(source)) continue;

    if (operation.kind === 'RS') {
      const placeholder = nodesById.get(operation.second);
      if (!placeholder || !isAttached(placeholder) || !placeholder.parent) continue;
      const targetParent = placeholder.parent;
      let targetIndex = targetParent.children.indexOf(placeholder);
      const children = [...source.children];
      removeNode(source);
      for (const child of children) {
        child.parent = targetParent;
        targetParent.children.splice(targetIndex++, 0, child);
      }
      removeNode(placeholder);
      continue;
    }

    const boundary = nodesById.get(operation.first);
    if (!boundary || !isAttached(boundary) || !boundary.parent) {
      removeNode(source);
      continue;
    }
    const parent = boundary.parent;
    const boundaryIndex = parent.children.indexOf(boundary);
    const start = parent.children[boundaryIndex - 1];
    if (start?.type !== 'comment') continue;
    let nesting = 0;
    let endIndex = -1;
    for (let index = boundaryIndex + 1; index < parent.children.length; index += 1) {
      const node = parent.children[index];
      if (node.type !== 'comment') continue;
      if (/^(?:\$|\$\?|\$~|\$!|&)$/.test(node.data)) nesting += 1;
      else if (/^(?:\/\$|\/&)$/i.test(node.data)) {
        if (nesting === 0) {
          endIndex = index;
          break;
        }
        nesting -= 1;
      }
    }
    if (endIndex < 0) continue;

    const children = [...source.children];
    removeNode(source);
    const currentBoundaryIndex = parent.children.indexOf(boundary);
    if (currentBoundaryIndex < 0) continue;
    for (const child of children) child.parent = parent;
    start.data = '$';
    parent.children.splice(currentBoundaryIndex, endIndex - boundaryIndex, ...children);
  }

  const textParts = [];
  const links = [];
  const productCards = [];
  const visit = (parent, inheritedHidden = false, inheritedFallbackDepth = 0, activeLinks = [], activeCards = []) => {
    let fallbackDepth = inheritedFallbackDepth;
    for (const node of parent.children) {
      if (node.type === 'comment') {
        if (node.data.trim() === '$?') fallbackDepth += 1;
        else if (node.data.trim() === '/$') fallbackDepth = Math.max(0, fallbackDepth - 1);
        continue;
      }
      if (node.type === 'text') {
        if (!inheritedHidden && fallbackDepth === 0) {
          const text = decodeHtmlText(node.data);
          textParts.push(text);
          for (const link of activeLinks) link.text += text;
          for (const card of activeCards) card.text += text;
        }
        continue;
      }

      const hidden = inheritedHidden || node.hidden || ['script', 'style', 'template', 'noscript'].includes(node.tag);
      const card = !hidden && node.className.split(/\s+/).includes('grid-slide')
        ? { text: '', links: [] }
        : null;
      const nestedCards = card ? [...activeCards, card] : activeCards;
      if (card) productCards.push(card);
      const nestedLinks = node.tag === 'a' && node.href && !hidden
        ? [...activeLinks, { href: node.href, text: '', productCards: nestedCards }]
        : activeLinks;
      if (nestedLinks.length > activeLinks.length) {
        links.push(nestedLinks.at(-1));
        for (const parentCard of nestedCards) parentCard.links.push(nestedLinks.at(-1));
      }
      fallbackDepth = visit(node, hidden, fallbackDepth, nestedLinks, nestedCards);
    }
    return fallbackDepth;
  };
  visit(root);

  return {
    text: textParts.join('').replace(/\s+/g, ' ').trim(),
    links: links.map(({ href, text }) => ({ href, text: text.replace(/\s+/g, ' ').trim() })),
    productCards: productCards.map(({ text, links: cardLinks }) => ({
      text: text.replace(/\s+/g, ' ').trim(),
      links: cardLinks.map(({ href, text: linkText }) => ({ href, text: linkText.replace(/\s+/g, ' ').trim() })),
    })),
  };
}

function splitDocument(html) {
  const match = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>[\s\S]*?<body\b[^>]*>([\s\S]*?)<\/body>/i);
  assert.ok(match, 'Expected a complete HTML document with head and body');
  return { head: match[1], body: match[2] };
}

function inlineStyleBytes(html) {
  return Array.from(html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi), (match) => Buffer.byteLength(match[0]))
    .reduce((total, size) => total + size, 0);
}

function stylesheetHrefs(head) {
  return getTags(head, 'link')
    .filter((tag) => getAttribute(tag, 'rel')?.toLowerCase().split(/\s+/).includes('stylesheet'))
    .map((tag) => getAttribute(tag, 'href'))
    .filter((href) => href !== null);
}

function alternateLinks(head) {
  return Object.fromEntries(
    getTags(head, 'link')
      .filter((tag) => getAttribute(tag, 'rel')?.toLowerCase() === 'alternate')
      .map((tag) => [getAttribute(tag, 'hreflang'), getAttribute(tag, 'href')])
      .filter(([language, href]) => language && href),
  );
}

function productJsonLd(html) {
  const scripts = Array.from(
    html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script(?:\s+[^>]*)?>/gi),
    (match) => ({ attributes: match[1], content: match[2] }),
  );
  return scripts
    .filter(({ attributes }) => /\btype=["']application\/ld\+json["']/i.test(attributes))
    .map(({ content }) => JSON.parse(content))
    .find((schema) => schema['@type'] === 'Product');
}

async function fetchHtml(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: { 'user-agent': 'PerfBee-Task-9-Built-Output-Contract/1.0' },
  });
  assert.equal(response.status, 200, `${pathname} should return HTTP 200`);
  return response.text();
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before becoming ready (${server.exitCode})\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // The socket is not ready yet.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${BASE_URL}\n${serverOutput}`);
}

before(async () => {
  assert.ok(
    existsSync(`${STOREFRONT_DIR}.next/BUILD_ID`),
    'Missing production build: run npm run build in apps/customer_storefront first',
  );
  server = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(PORT)], {
    cwd: STOREFRONT_DIR,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer();
}, { timeout: 60_000 });

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    delay(5_000),
  ]);
});

test('production HTML stays within budget with loadable styles and integrated product SEO', { timeout: 120_000 }, async (t) => {
  const [homeHtml, productHtml] = await Promise.all([
    fetchHtml('/'),
    fetchHtml(PRODUCT_PATH),
  ]);
  const homeBytes = Buffer.byteLength(homeHtml);
  const productBytes = Buffer.byteLength(productHtml);

  assert.ok(homeBytes <= HOME_HTML_BUDGET, `Homepage HTML ${homeBytes} exceeds ${HOME_HTML_BUDGET} bytes`);
  assert.ok(productBytes <= PRODUCT_HTML_BUDGET, `Product HTML ${productBytes} exceeds ${PRODUCT_HTML_BUDGET} bytes`);
  assert.ok(inlineStyleBytes(homeHtml) <= MAX_INLINE_STYLE_BYTES, 'Homepage reintroduced global inline CSS');
  assert.ok(inlineStyleBytes(productHtml) <= MAX_INLINE_STYLE_BYTES, 'Product page reintroduced global inline CSS');
  assert.match(homeHtml, /<\/body>\s*<\/html>\s*$/i, 'Expected a complete HTTP 200 homepage response');

  const homepage = effectiveBodyContent(homeHtml);
  for (const heading of ['A well-stocked home starts here.', 'Deal of the Week', 'Shop Popular Brands']) {
    assert.equal(
      homepage.text.split(heading).length - 1,
      1,
      `Expected homepage content "${heading}" exactly once after completed React stream segments are applied`,
    );
  }
  assert.ok(
    homepage.productCards.some(({ text, links }) =>
      links.some(({ href, text: linkText }) => /^\/(?:bn\/)?product\//.test(href) && linkText.length > 0)
      && /৳\s*[\d০-৯]/.test(text)
    ),
    'Expected a visible product link and price in the same completed homepage product card',
  );

  const { head, body } = splitDocument(productHtml);
  const headLinks = getTags(head, 'link');
  const bodyLinks = getTags(body, 'link');
  const canonicalTags = headLinks.filter((tag) => getAttribute(tag, 'rel')?.toLowerCase() === 'canonical');
  assert.equal(canonicalTags.length, 1, 'Expected one canonical link in final document head');
  assert.equal(getAttribute(canonicalTags[0], 'href'), PRODUCT_CANONICAL);
  assert.equal(
    bodyLinks.filter((tag) => getAttribute(tag, 'rel')?.toLowerCase() === 'canonical').length,
    0,
    'Canonical link must not stream into the body',
  );
  assert.deepEqual(alternateLinks(head), {
    'en-BD': PRODUCT_CANONICAL,
    'bn-BD': PRODUCT_CANONICAL.replace('/product/', '/bn/product/'),
    'x-default': PRODUCT_CANONICAL,
  });
  assert.equal(
    bodyLinks.filter((tag) =>
      getAttribute(tag, 'rel')?.toLowerCase() === 'alternate' && getAttribute(tag, 'hreflang')
    ).length,
    0,
    'Hreflang link tags must not stream into the body',
  );
  assert.match(head, /<title>Aarong Standardized Milk 500ml[^<]*Lucky Store<\/title>/);
  assert.match(head, /<meta[^>]*name=["']description["'][^>]*>/i);

  const schema = productJsonLd(productHtml);
  assert.ok(schema, 'Expected raw-HTML Product JSON-LD');
  assert.equal(schema.name, 'Aarong Standardized Milk 500ml');
  assert.equal(schema.offers.url, PRODUCT_CANONICAL);
  assert.match(body, /<h1\b[^>]*>Aarong Standardized Milk 500ml<\/h1>/);
  assert.match(body, /৳50/);

  const homeStylesheets = stylesheetHrefs(splitDocument(homeHtml).head).sort();
  const productStylesheets = stylesheetHrefs(head).sort();
  assert.ok(productStylesheets.length > 0, 'Expected external stylesheets in final document head');
  assert.deepEqual(productStylesheets, homeStylesheets, 'Shared routes should reference the same stylesheet set');
  for (const href of productStylesheets) {
    assert.match(href, /^\/_next\/static\/css\/[a-f0-9]{16}\.css$/);
  }

  let combinedCss = '';
  let stylesheetBytes = 0;
  for (const href of productStylesheets) {
    const response = await fetch(`${BASE_URL}${href}`);
    assert.equal(response.status, 200, `${href} should load successfully`);
    assert.match(response.headers.get('content-type') || '', /^text\/css\b/i);
    const css = await response.text();
    stylesheetBytes += Buffer.byteLength(css);
    combinedCss += css;
  }
  assert.ok(stylesheetBytes >= 100_000, `Expected retained shared styles, received ${stylesheetBytes} bytes`);
  assert.ok(stylesheetBytes <= 130_000, `Unexpected stylesheet growth to ${stylesheetBytes} bytes`);
  assert.match(combinedCss, /box-sizing:border-box/);
  assert.match(combinedCss, /font-display:swap/);
  assert.match(body, /class=["'][^"']*aspect-square[^"']*["']/);
  assert.match(combinedCss, /\.aspect-square\{aspect-ratio:1\/1\}/);

  const scriptSources = [...new Set(
    getTags(productHtml, 'script')
      .map((tag) => getAttribute(tag, 'src'))
      .filter((src) => src?.startsWith('/_next/static/')),
  )];
  assert.ok(scriptSources.length > 0, 'Expected hydration scripts in built HTML');
  assert.match(productHtml, /self\.__next_f\.push/, 'Expected initial React Flight payload');
  for (const src of scriptSources) {
    const response = await fetch(`${BASE_URL}${src}`);
    assert.equal(response.status, 200, `${src} should load successfully`);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
  }

  assert.match(body, /href=["']#main-content["']/);
  assert.match(body, /<main\b[^>]*id=["']main-content["']/);
  assert.match(body, /aria-label=["']Open menu["']/);
  assert.match(body, /aria-haspopup=["']dialog["']/);
  assert.match(body, /aria-label=["']Primary navigation["']/);
  const imageTags = getTags(body, 'img');
  assert.ok(imageTags.length > 0, 'Expected server-rendered product images');
  assert.equal(imageTags.filter((tag) => getAttribute(tag, 'alt') === null).length, 0, 'Every image needs an alt attribute');

  t.diagnostic(JSON.stringify({
    homeBytes,
    homeBudget: HOME_HTML_BUDGET,
    productBytes,
    productBudget: PRODUCT_HTML_BUDGET,
    inlineStyleBytes: inlineStyleBytes(productHtml),
    stylesheetBytes,
    stylesheetHrefs: productStylesheets,
    hydrationScriptCount: scriptSources.length,
  }));
});

test('completed React stream segments count once and exclude fallback and incomplete content', () => {
  const fixture = `<html><head></head><body><main>
    <!--$?--><template id="B:1"></template><p>Fallback-only content</p><!--/$-->
    <div hidden id="S:1"><p>Completed hero product ৳50</p></div>
    <div hidden id="S:2">Incomplete stream content</div>
    <div hidden id="S:0"><section><template id="P:1"></template></section></div>
    <div hidden>Hidden fallback content</div>
    <script>$RS("S:1","P:1");$RS("S:1","P:1");$RC("B:1","S:0");$RC("B:1","S:0")</script>
  </main></body></html>`;

  const content = effectiveBodyContent(fixture);
  assert.equal(content.text, 'Completed hero product ৳50');
  assert.equal(content.text.split('Completed hero').length - 1, 1, 'Repeated completion markers must not double-count segment text');
  assert.doesNotMatch(content.text, /Fallback-only|Incomplete stream|Hidden fallback/);
});

test('Product JSON-LD parser accepts browser-tolerated script end tags', () => {
  for (const closingTag of ['</script >', '</script\t\n bar>']) {
    const schema = productJsonLd(
      `<script type="application/ld+json">{"@type":"Product","name":"Fixture"}${closingTag}`,
    );
    assert.equal(schema?.name, 'Fixture');
  }
});
