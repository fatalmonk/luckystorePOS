import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type Browser,
  type Page,
  type TestInfo,
} from '@playwright/test';

const PUBLIC_ORIGIN = 'https://www.luckystore1947.com';
const PRODUCT_PATH = '/product/aarong-dairy-pure-liquid-milk--a0740002';
const BENGALI_PRODUCT_PATH = `/bn${PRODUCT_PATH}`;

type RouteContract = {
  label: string;
  path: string;
  canonical: string;
  alternates: Record<'en-BD' | 'bn-BD' | 'x-default', string>;
  unpublishedAlternates?: Record<string, string>;
};

const routes: RouteContract[] = [
  {
    label: 'English product',
    path: PRODUCT_PATH,
    canonical: `${PUBLIC_ORIGIN}${PRODUCT_PATH}`,
    alternates: {
      'en-BD': `${PUBLIC_ORIGIN}${PRODUCT_PATH}`,
      'bn-BD': `${PUBLIC_ORIGIN}${BENGALI_PRODUCT_PATH}`,
      'x-default': `${PUBLIC_ORIGIN}${PRODUCT_PATH}`,
    },
    unpublishedAlternates: {
      'en-BD': `${PUBLIC_ORIGIN}${PRODUCT_PATH}`,
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
    unpublishedAlternates: {},
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
];

function assertAlternates(route: RouteContract, alternateMap: Record<string, string | null>, count: number, label: string) {
  const sameAlternates = (expected: Record<string, string>) =>
    Object.keys(alternateMap).length === Object.keys(expected).length
    && Object.entries(expected).every(([language, url]) => alternateMap[language] === url);
  const published = sameAlternates(route.alternates);
  const unpublished = route.unpublishedAlternates !== undefined
    && sameAlternates(route.unpublishedAlternates);
  expect(published || unpublished, `${label}: alternate values match a publication state`).toBe(true);
  expect(count, `${label}: alternate count`).toBe(Object.keys(alternateMap).length);
  return unpublished;
}

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

type HttpDisposition = 'ok' | 'limitation' | 'contract_failure';

function classifyHttpStatus(status: number): HttpDisposition {
  if (status === 200) return 'ok';
  if (status === 429) return 'limitation';
  return 'contract_failure';
}

function failForLimitation(
  reason: string,
  annotations: TestInfo['annotations'] = test.info().annotations,
): never {
  const message = `SEO verification limitation: ${reason}`;
  annotations.push({ type: 'limitation', description: message });
  throw new Error(message);
}

function assertExpectedHttp200(
  status: number,
  label: string,
  annotations?: TestInfo['annotations'],
) {
  const disposition = classifyHttpStatus(status);
  if (disposition === 'limitation') {
    return failForLimitation(
      `${label} was rate limited with HTTP 429; no SEO conclusion was made`,
      annotations,
    );
  }
  if (disposition === 'contract_failure') {
    throw new Error(`SEO response contract failure: ${label} returned HTTP ${status}; expected HTTP 200`);
  }
}

function isLocalBaseUrl(baseUrl: URL) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname);
}

function requireExpectedBuildSha(baseUrl: URL, candidate: string | undefined) {
  const expectedBuildSha = candidate?.trim() || null;
  if (!isLocalBaseUrl(baseUrl) && !expectedBuildSha) {
    throw new Error(
      `Deployment provenance contract failure: EXPECTED_BUILD_SHA is required for ${baseUrl.origin}`,
    );
  }
  return expectedBuildSha;
}

function configuredBaseUrl(testInfo: TestInfo) {
  const baseUrl = testInfo.project.use.baseURL;
  if (typeof baseUrl !== 'string') {
    throw new Error('SEO response contract failure: Playwright baseURL must be configured');
  }
  return new URL(baseUrl);
}

function assertFinalLocation(actualUrl: string, baseUrl: URL, path: string, label: string) {
  const finalUrl = new URL(actualUrl);
  expect(finalUrl.origin, `${label}: final origin`).toBe(baseUrl.origin);
  expect(finalUrl.pathname, `${label}: final pathname`).toBe(path);
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
    return failForLimitation(`${route.label} raw request failed: ${String(error)}`);
  }

  assertExpectedHttp200(response.status(), `${route.label} raw response`);

  let html: string;
  try {
    html = await response.text();
  } catch (error) {
    return failForLimitation(`${route.label} response body was incomplete: ${String(error)}`);
  }

  const document = splitCompleteDocument(html);
  if (!document) {
    return failForLimitation(`${route.label} response was partial HTML without a complete head and body`);
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
  const unpublished = assertAlternates(route, alternateMap, head.alternates.length, `${route.label}: raw head`);
  if (unpublished && route.label === 'Bengali product') {
    expect(head.robots.some((tag) => getAttribute(tag, 'content')?.includes('noindex')),
      `${route.label}: unpublished page is noindex`).toBe(true);
  }

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

async function assertBrowserSeoContract(page: Page, route: RouteContract, baseUrl: URL) {
  let response;
  try {
    response = await page.goto(route.path, { waitUntil: 'load' });
  } catch (error) {
    return failForLimitation(`${route.label} browser navigation failed: ${String(error)}`);
  }

  if (!response) {
    return failForLimitation(`${route.label} browser navigation returned no response`);
  }
  assertExpectedHttp200(response.status(), `${route.label} browser response`);

  assertFinalLocation(page.url(), baseUrl, route.path, `${route.label}: browser`);
  const canonical = page.locator('head link[rel~="canonical"]');
  const alternates = page.locator('head link[rel~="alternate"]');
  await expect(canonical, `${route.label}: DOM head canonical count`).toHaveCount(1);
  await expect(canonical, `${route.label}: DOM canonical value`).toHaveAttribute('href', route.canonical);
  await expect(page.locator('head title'), `${route.label}: DOM head title count`).toHaveCount(1);
  await expect(page.locator('head meta[name="description"]'), `${route.label}: DOM head description count`).toHaveCount(1);
  const alternateMap = Object.fromEntries(await alternates.evaluateAll((links) =>
    links.map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')])));
  const unpublished = assertAlternates(route, alternateMap, await alternates.count(), `${route.label}: DOM head`);
  if (unpublished && route.label === 'Bengali product') {
    await expect(page.locator('head meta[name="robots"]'), `${route.label}: unpublished page is noindex`)
      .toHaveAttribute('content', /noindex/);
  }

  await expect(page.locator('body link[rel~="canonical"]'), `${route.label}: DOM body canonical count`).toHaveCount(0);
  await expect(page.locator('body title'), `${route.label}: DOM body title count`).toHaveCount(0);
  await expect(page.locator('body meta[name="description"]'), `${route.label}: DOM body description count`).toHaveCount(0);
  await expect(page.locator('body meta[name="robots"]'), `${route.label}: DOM body robots count`).toHaveCount(0);
  await expect(page.locator('body link[rel~="alternate"]'), `${route.label}: DOM body alternate count`).toHaveCount(0);
}

test.describe('SEO response contract semantics', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'SEO metadata is viewport-independent');
  });

  test('[semantics] limitations annotate and throw while unexpected statuses fail the contract', () => {
    const annotations: TestInfo['annotations'] = [];
    expect(() => assertExpectedHttp200(429, 'fixture route', annotations)).toThrow(
      'SEO verification limitation: fixture route was rate limited with HTTP 429',
    );
    expect(annotations).toEqual([{
      type: 'limitation',
      description: expect.stringContaining('HTTP 429'),
    }]);
    expect(() => assertExpectedHttp200(404, 'fixture route')).toThrow(
      'SEO response contract failure: fixture route returned HTTP 404',
    );
    expect(() => assertExpectedHttp200(500, 'fixture route')).toThrow(
      'SEO response contract failure: fixture route returned HTTP 500',
    );
  });

  test('[semantics] non-local targets require provenance while localhost may omit it', () => {
    expect(requireExpectedBuildSha(new URL('http://localhost:3000'), undefined)).toBeNull();
    expect(requireExpectedBuildSha(new URL('http://127.0.0.1:3000'), undefined)).toBeNull();
    expect(() => requireExpectedBuildSha(new URL('https://next.luckystore1947.com'), undefined)).toThrow(
      'EXPECTED_BUILD_SHA is required',
    );
    expect(
      requireExpectedBuildSha(new URL('https://next.luckystore1947.com'), '18fbc3ac'),
    ).toBe('18fbc3ac');
  });

  test('[semantics] final location must retain configured origin and pathname', () => {
    const baseUrl = new URL('https://next.luckystore1947.com');
    expect(() => assertFinalLocation(
      `https://www.luckystore1947.com${PRODUCT_PATH}`,
      baseUrl,
      PRODUCT_PATH,
      'fixture route',
    )).toThrow('fixture route: final origin');
    expect(() => assertFinalLocation(
      `${baseUrl.origin}${PRODUCT_PATH}`,
      baseUrl,
      PRODUCT_PATH,
      'fixture route',
    )).not.toThrow();
  });

  test('[raw] Link relation parser does not classify discovery relations as canonical', () => {
    const headers = [
      '</_next/static/app.css>; rel=preload; as=style, </sitemap.xml>; rel=sitemap',
      '<https://www.luckystore1947.com/api>; rel="service discovery"',
    ];
    expect(canonicalLinkHeaderUrls(headers, PUBLIC_ORIGIN)).toEqual([]);
  });
});

test.describe('raw response and browser DOM SEO contract', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'SEO metadata is viewport-independent');
  });

  test.beforeAll(async ({ request }, testInfo) => {
    const baseUrl = configuredBaseUrl(testInfo);
    const expectedBuildSha = requireExpectedBuildSha(
      baseUrl,
      process.env.EXPECTED_BUILD_SHA,
    );
    if (!expectedBuildSha) return;

    let response: APIResponse;
    try {
      response = await request.get('/api/health', { failOnStatusCode: false });
    } catch (error) {
      return failForLimitation(
        `build provenance health request failed: ${String(error)}`,
        testInfo.annotations,
      );
    }

    assertExpectedHttp200(response.status(), 'build provenance /api/health', testInfo.annotations);
    assertFinalLocation(response.url(), baseUrl, '/api/health', 'build provenance health response');

    let health: { status?: unknown; buildSha?: unknown };
    try {
      health = await response.json() as { status?: unknown; buildSha?: unknown };
    } catch (error) {
      throw new Error(`Build provenance contract failure: /api/health returned invalid JSON: ${String(error)}`);
    }

    expect(health.status, 'health status').toBe('ok');
    expect(health.buildSha, 'reviewed deployment build SHA').toBe(expectedBuildSha);
  });

  for (const route of routes) {
    test(`[raw] ${route.label} keeps canonical metadata in head`, async ({ request }, testInfo) => {
      const baseUrl = configuredBaseUrl(testInfo);
      const { head, body, response } = await getCompleteRawDocument(request, route);
      assertFinalLocation(response.url(), baseUrl, route.path, `${route.label}: raw response`);
      assertRawSeoContract(route, { head, body }, response);
    });

    test(`[browser] ${route.label} matches the raw SEO contract`, async ({ playwright }, testInfo) => {
      const baseUrl = configuredBaseUrl(testInfo);
      let browser: Browser;
      try {
        browser = await playwright.chromium.launch();
      } catch (error) {
        return failForLimitation(
          `${route.label} Chromium could not launch: ${String(error)}`,
          testInfo.annotations,
        );
      }

      try {
        const page = await browser.newPage({ baseURL: baseUrl.href });
        await assertBrowserSeoContract(page, route, baseUrl);
      } finally {
        await browser.close();
      }
    });
  }
});
