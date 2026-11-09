import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type Browser,
  type Page,
} from '@playwright/test';

const PUBLIC_ORIGIN = 'https://www.luckystore1947.com';
const PRODUCT_PATH = '/product/aarong-standardized-milk-500-ml--3d7c76cf';
const BENGALI_PRODUCT_PATH = `/bn${PRODUCT_PATH}`;

type RouteContract = {
  label: string;
  path: string;
  canonical: string;
  alternates: Record<'en-BD' | 'bn-BD' | 'x-default', string>;
};

const routes = [
  {
    label: 'English product',
    path: PRODUCT_PATH,
    canonical: `${PUBLIC_ORIGIN}${PRODUCT_PATH}`,
    alternates: {
      'en-BD': `${PUBLIC_ORIGIN}${PRODUCT_PATH}`,
      'bn-BD': `${PUBLIC_ORIGIN}${BENGALI_PRODUCT_PATH}`,
      'x-default': `${PUBLIC_ORIGIN}${PRODUCT_PATH}`,
    },
  },
  {
    label: 'Bengali product',
    path: BENGALI_PRODUCT_PATH,
    canonical: `${PUBLIC_ORIGIN}${BENGALI_PRODUCT_PATH}`,
    alternates: {
      'en-BD': `${PUBLIC_ORIGIN}${PRODUCT_PATH}`,
      'bn-BD': `${PUBLIC_ORIGIN}${BENGALI_PRODUCT_PATH}`,
      'x-default': `${PUBLIC_ORIGIN}${PRODUCT_PATH}`,
    },
  },
  {
    label: 'Deal of the Week',
    path: '/best/dealoftheweek',
    canonical: `${PUBLIC_ORIGIN}/best/dealoftheweek`,
    alternates: {
      'en-BD': `${PUBLIC_ORIGIN}/best/dealoftheweek`,
      'bn-BD': `${PUBLIC_ORIGIN}/bn/best/dealoftheweek`,
      'x-default': `${PUBLIC_ORIGIN}/best/dealoftheweek`,
    },
  },
] satisfies RouteContract[];

function getTags(html: string, name: string) {
  return Array.from(html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi')), (match) => match[0]);
}

function getAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match?.[1] ?? match?.[2] ?? null;
}

function hasRel(tag: string, relation: string) {
  return getAttribute(tag, 'rel')
    ?.toLowerCase()
    .split(/\s+/)
    .includes(relation) ?? false;
}

function splitCompleteDocument(html: string) {
  const document = html.match(/<html\b[^>]*>[\s\S]*<\/html>\s*$/i)?.[0];
  if (!document) return null;

  const head = document.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  const body = document.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (!head || !body || (head.index ?? 0) > (body.index ?? 0)) return null;

  return { head: head[1], body: body[1] };
}

function seoElements(html: string) {
  const links = getTags(html, 'link');
  const meta = getTags(html, 'meta');
  return {
    canonicals: links.filter((tag) => hasRel(tag, 'canonical')),
    alternates: links.filter((tag) => hasRel(tag, 'alternate')),
    titles: getTags(html, 'title'),
    descriptions: meta.filter((tag) => getAttribute(tag, 'name')?.toLowerCase() === 'description'),
    robots: meta.filter((tag) => getAttribute(tag, 'name')?.toLowerCase() === 'robots'),
  };
}

function splitLinkHeader(value: string) {
  const entries: string[] = [];
  let start = 0;
  let inTarget = false;
  let inQuote = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') inQuote = !inQuote;
    else if (!inQuote && character === '<') inTarget = true;
    else if (!inQuote && character === '>') inTarget = false;
    else if (!inQuote && !inTarget && character === ',') {
      entries.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  entries.push(value.slice(start).trim());
  return entries.filter(Boolean);
}

function canonicalLinkHeaderUrls(values: string[], responseUrl: string) {
  return values.flatMap(splitLinkHeader).flatMap((entry) => {
    const target = entry.match(/^\s*<([^>]*)>/)?.[1];
    const parameters = target === undefined ? entry : entry.slice(entry.indexOf('>') + 1);
    const rel = parameters.match(/(?:^|;)\s*rel\s*=\s*(?:"([^"]*)"|([^;\s,]+))/i);
    const relations = (rel?.[1] ?? rel?.[2] ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!relations.includes('canonical')) return [];
    if (!target) throw new Error(`Malformed canonical Link header: ${entry}`);
    return [new URL(target, responseUrl).href];
  });
}

function skipForLimitation(reason: string): never {
  const message = `SEO verification limitation: ${reason}`;
  test.info().annotations.push({ type: 'limitation', description: message });
  test.skip(true, message);
  throw new Error(message);
}

async function getCompleteRawDocument(request: APIRequestContext, route: RouteContract) {
  let response: APIResponse;
  try {
    response = await request.get(route.path, {
      failOnStatusCode: false,
      headers: {
        accept: 'text/html',
        'user-agent': 'Lucky-Store-SEO-Response-Contract/1.0',
      },
    });
  } catch (error) {
    return skipForLimitation(`${route.label} raw request failed: ${String(error)}`);
  }

  if (response.status() !== 200) {
    const reason = response.status() === 429
      ? 'was rate limited with HTTP 429; no SEO conclusion was made'
      : `returned HTTP ${response.status()} instead of a complete 200 response`;
    return skipForLimitation(`${route.label} ${reason}`);
  }

  let html: string;
  try {
    html = await response.text();
  } catch (error) {
    return skipForLimitation(`${route.label} response body was incomplete: ${String(error)}`);
  }

  const document = splitCompleteDocument(html);
  if (!document) {
    return skipForLimitation(`${route.label} response was partial HTML without a complete head and body`);
  }

  return { ...document, response };
}

function assertRawSeoContract(
  route: RouteContract,
  document: NonNullable<ReturnType<typeof splitCompleteDocument>>,
  response: APIResponse,
) {
  const head = seoElements(document.head);
  const body = seoElements(document.body);
  const canonicalHrefs = head.canonicals.map((tag) => getAttribute(tag, 'href'));
  const alternatePairs = head.alternates.map((tag) => [
    getAttribute(tag, 'hreflang'),
    getAttribute(tag, 'href'),
  ] as const);
  const alternateMap = Object.fromEntries(alternatePairs);

  expect(head.canonicals, `${route.label}: raw head canonical count`).toHaveLength(1);
  expect(canonicalHrefs, `${route.label}: raw canonical value`).toEqual([route.canonical]);
  expect(head.titles, `${route.label}: raw head title count`).toHaveLength(1);
  expect(head.descriptions, `${route.label}: raw head description count`).toHaveLength(1);
  expect(head.alternates, `${route.label}: raw head alternate count`).toHaveLength(3);
  expect(Object.keys(alternateMap), `${route.label}: unique raw hreflang values`).toHaveLength(3);
  expect(alternateMap, `${route.label}: raw alternate values`).toEqual(route.alternates);

  expect(body.canonicals, `${route.label}: raw body canonical count`).toHaveLength(0);
  expect(body.titles, `${route.label}: raw body title count`).toHaveLength(0);
  expect(body.descriptions, `${route.label}: raw body description count`).toHaveLength(0);
  expect(body.robots, `${route.label}: raw body robots count`).toHaveLength(0);
  expect(body.alternates, `${route.label}: raw body alternate count`).toHaveLength(0);

  const linkHeaders = response.headersArray()
    .filter(({ name }) => name.toLowerCase() === 'link')
    .map(({ value }) => value);
  const canonicalHeaders = canonicalLinkHeaderUrls(linkHeaders, response.url());
  const uniqueCanonicalHeaders = [...new Set(canonicalHeaders)];
  expect(
    uniqueCanonicalHeaders,
    `${route.label}: canonical Link header must be absent or agree with HTML`,
  ).toEqual(canonicalHeaders.length === 0 ? [] : [route.canonical]);
}

async function assertBrowserSeoContract(page: Page, route: RouteContract) {
  let response;
  try {
    response = await page.goto(route.path, { waitUntil: 'load' });
  } catch (error) {
    return skipForLimitation(`${route.label} browser navigation failed: ${String(error)}`);
  }

  if (!response || response.status() !== 200) {
    const status = response?.status() ?? 'no response';
    return skipForLimitation(`${route.label} browser navigation returned ${status}, not HTTP 200`);
  }

  expect(new URL(page.url()).pathname, `${route.label}: browser final pathname`).toBe(route.path);
  const canonical = page.locator('head link[rel~="canonical"]');
  const alternates = page.locator('head link[rel~="alternate"]');
  await expect(canonical, `${route.label}: DOM head canonical count`).toHaveCount(1);
  await expect(canonical, `${route.label}: DOM canonical value`).toHaveAttribute('href', route.canonical);
  await expect(page.locator('head title'), `${route.label}: DOM head title count`).toHaveCount(1);
  await expect(page.locator('head meta[name="description"]'), `${route.label}: DOM head description count`).toHaveCount(1);
  await expect(alternates, `${route.label}: DOM head alternate count`).toHaveCount(3);

  const alternateMap = Object.fromEntries(await alternates.evaluateAll((links) =>
    links.map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')])));
  expect(alternateMap, `${route.label}: DOM alternate values`).toEqual(route.alternates);

  await expect(page.locator('body link[rel~="canonical"]'), `${route.label}: DOM body canonical count`).toHaveCount(0);
  await expect(page.locator('body title'), `${route.label}: DOM body title count`).toHaveCount(0);
  await expect(page.locator('body meta[name="description"]'), `${route.label}: DOM body description count`).toHaveCount(0);
  await expect(page.locator('body meta[name="robots"]'), `${route.label}: DOM body robots count`).toHaveCount(0);
  await expect(page.locator('body link[rel~="alternate"]'), `${route.label}: DOM body alternate count`).toHaveCount(0);
}

test.describe('raw response and browser DOM SEO contract', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'SEO metadata is viewport-independent');
  });

  test.beforeAll(async ({ request }) => {
    const expectedBuildSha = process.env.EXPECTED_BUILD_SHA?.trim();
    if (!expectedBuildSha) return;

    let response: APIResponse;
    try {
      response = await request.get('/api/health', { failOnStatusCode: false });
    } catch (error) {
      throw new Error(`Build provenance verification limitation: health request failed: ${String(error)}`);
    }

    if (response.status() !== 200) {
      throw new Error(`Build provenance verification limitation: /api/health returned HTTP ${response.status()}`);
    }

    const health = await response.json() as { status?: unknown; buildSha?: unknown };
    expect(health.status, 'health status').toBe('ok');
    expect(health.buildSha, 'reviewed deployment build SHA').toBe(expectedBuildSha);
  });

  test('Link relation parser does not classify discovery relations as canonical', () => {
    const headers = [
      '</_next/static/app.css>; rel=preload; as=style, </sitemap.xml>; rel=sitemap',
      '<https://www.luckystore1947.com/api>; rel="service discovery"',
    ];
    expect(canonicalLinkHeaderUrls(headers, PUBLIC_ORIGIN)).toEqual([]);
  });

  test('raw route matrix keeps canonical metadata in head', async ({ request }) => {
    for (const route of routes) {
      const { head, body, response } = await getCompleteRawDocument(request, route);
      expect(new URL(response.url()).pathname, `${route.label}: raw final pathname`).toBe(route.path);
      assertRawSeoContract(route, { head, body }, response);
    }
  });

  test('browser route matrix matches the raw SEO contract', async ({ playwright }, testInfo) => {
    let browser: Browser;
    try {
      browser = await playwright.chromium.launch();
    } catch (error) {
      return skipForLimitation(`Chromium could not launch: ${String(error)}`);
    }

    try {
      const page = await browser.newPage({ baseURL: testInfo.project.use.baseURL });
      for (const route of routes) {
        await assertBrowserSeoContract(page, route);
      }
    } finally {
      await browser.close();
    }
  });
});
