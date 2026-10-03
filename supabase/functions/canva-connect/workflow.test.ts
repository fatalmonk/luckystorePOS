// Test doubles intentionally return immediate promises.
// deno-lint-ignore-file require-await
import { assertEquals, assertRejects } from '@std/assert';
import { Actor, CanvaService, SafeError } from './core.ts';
import { Run, validSource, WorkflowProvider, WorkflowRepository, WorkflowService } from './workflow.ts';

const actor: Actor = { id: 'user', tenant_id: 'tenant', store_id: 'store', role: 'manager' };
const template = { canva_template_id: 'approved', expected_dataset_schema: { product_1_image: { type: 'image' } } };
function fixture(run: Partial<Run> = {}, fetcher?: typeof fetch) {
  const calls: string[] = []; let saved: Record<string, unknown> = {};
  const repo: WorkflowRepository = {
    transition: async (action, _actor, data) => {
      calls.push(action);
      if (action === 'claim') return { result: 'claimed', template, run: {
        id: 'run', connection_id: 'connection', template_id: 'template', status: 'created',
        products: [{ id: 'item', name: 'Product', price: 50, image_url: 'https://images.luckystore1947.com/products/test.webp' }],
        assets: [], ...run,
      } };
      saved = data; return data;
    },
    list: async () => [], templates: async () => [],
  };
  const oauth = { getValidCanvaAccessToken: async () => 'server-only-token' } as unknown as CanvaService;
  const service = new WorkflowService(repo, oauth, new WorkflowProvider(fetcher));
  return { service, calls, saved: () => saved };
}
Deno.test('image sources reject private hosts, credentials, foreign hosts and encoded paths', () => {
  for (const value of ['http://images.luckystore1947.com/products/a', 'https://127.0.0.1/products/a',
    'https://user:password@images.luckystore1947.com/products/a', 'https://images.luckystore1947.com.evil.test/products/a',
    'https://images.luckystore1947.com/products/%2e%2e/a']) assertEquals(validSource(value), false);
  assertEquals(validSource('https://images.luckystore1947.com/products/test.webp?t=1'), true);
});
Deno.test('a pending upload is polled without creating a duplicate upload', async () => {
  const paths: string[] = [];
  const f = fixture({ assets: [{ job_id: 'prior' }] }, async input => {
    const path = new URL(String(input)).pathname; paths.push(path);
    return Response.json(path.endsWith('/dataset') ? { dataset: template.expected_dataset_schema } :
      { job: { id: 'prior', status: 'success', asset: { id: 'asset' } } });
  });
  await f.service.advance(actor, 'run');
  assertEquals(paths, ['/rest/v1/brand-templates/approved/dataset','/rest/v1/url-asset-uploads/prior']);
  assertEquals(f.saved().assets, [{ job_id: 'prior', asset_id: 'asset' }]);
});
Deno.test('dataset drift fails before any upload', async () => {
  let count = 0;
  const f = fixture({}, async () => { count++; return Response.json({ dataset: {} }); });
  await f.service.advance(actor, 'run');
  assertEquals(count, 1); assertEquals(f.saved().status, 'failed');
  assertEquals(f.saved().error_code, 'CANVA_TEMPLATE_DATASET_MISMATCH');
});
Deno.test('ambiguous upload failure is persisted terminal without retry', async () => {
  let creates = 0;
  const f = fixture({}, async (_url, init) => {
    if (init?.method === 'POST') { creates++; throw new Error('sensitive provider error'); }
    return Response.json({ dataset: template.expected_dataset_schema });
  });
  await f.service.advance(actor, 'run');
  assertEquals(creates, 1); assertEquals(f.saved().status, 'failed');
  assertEquals(f.saved().error_code, 'CANVA_PROVIDER_OPERATION_FAILED');
});
Deno.test('untrusted product URLs cannot reach provider', async () => {
  let count = 0;
  const f = fixture({ products: [{ id: 'item', name: 'Product', price: 10, image_url: 'https://localhost/products/a' }] },
    async () => { count++; return Response.json({}); });
  await f.service.advance(actor, 'run'); assertEquals(count, 0);
  assertEquals(f.saved().error_code, 'CANVA_IMAGE_SOURCE_DENIED');
});
Deno.test('start excludes client names, prices, URLs and scope', async () => {
  const f = fixture();
  const id = '11111111-1111-4111-8111-111111111111';
  await f.service.start(actor, { request_id: id, template_id: id, item_ids: [id], name: 'client name', image_url: 'https://evil.test/image', price: 1, tenant_id: 'foreign' });
  assertEquals(f.saved(), { request_id: id, template_id: id, item_ids: [id] });
  await assertRejects(() => f.service.start(actor, { item_ids: [] }), SafeError);
});
Deno.test('successful autofill stores only the design ID and stops', async () => {
  const f = fixture({ assets: [{ job_id: 'upload', asset_id: 'asset' }], autofill_job_id: 'fill', status: 'autofilling' },
    async input => Response.json(String(input).endsWith('/dataset') ? { dataset: template.expected_dataset_schema } :
      { job: { id: 'fill', status: 'success', result: { design: { id: 'design' } } } }));
  await f.service.advance(actor, 'run');
  assertEquals(f.saved().status, 'design_ready'); assertEquals(f.saved().design_id, 'design');
});
