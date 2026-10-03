import { Actor, CanvaService, SafeError } from './core.ts';

export type Product = { id: string; name: string; price: number; image_url: string };
export type Asset = { job_id: string; asset_id?: string };
export type Run = {
  id: string; connection_id: string; template_id: string; products: Product[]; assets: Asset[];
  status: string; autofill_job_id?: string; design_id?: string; error_code?: string;
};
export type Template = { canva_template_id: string; expected_dataset_schema: Record<string, { type: string }> };
export interface WorkflowRepository {
  transition(action: string, actor: Actor, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  list(actor: Actor): Promise<Run[]>;
  templates(actor: Actor): Promise<unknown[]>;
}
type Job = { id: string; status: string; asset?: { id: string }; result?: { design: { id: string } } };

export function validSource(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname === 'images.luckystore1947.com' &&
      !u.username && !u.password && !u.port && u.pathname.startsWith('/products/') &&
      !/%|\.\./.test(u.pathname);
  } catch { return false; }
}
export class WorkflowProvider {
  constructor(private fetcher: typeof fetch = fetch) {}
  async request(token: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
    try {
      const response = await this.fetcher(`https://api.canva.com/rest/v1/${path}`, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error();
      return await response.json();
    } catch { throw new SafeError('CANVA_PROVIDER_OPERATION_FAILED', 502); }
  }
  async validate(token: string, template: Template) {
    const result = await this.request(token, `brand-templates/${encodeURIComponent(template.canva_template_id)}/dataset`);
    const dataset = result.dataset as Template['expected_dataset_schema'];
    const expected = template.expected_dataset_schema;
    if (!dataset || Object.keys(dataset).length !== Object.keys(expected).length ||
      !Object.entries(expected).every(([key, value]) => dataset[key]?.type === value.type)) {
      throw new SafeError('CANVA_TEMPLATE_DATASET_MISMATCH', 409);
    }
  }
  async job(token: string, path: string, body?: unknown): Promise<Job> {
    const result = await this.request(token, path, body);
    const job = result.job as Job;
    if (!job || typeof job.id !== 'string' || !['in_progress', 'success', 'failed'].includes(job.status)) {
      throw new SafeError('CANVA_PROVIDER_RESPONSE_INVALID', 502);
    }
    if (job.status === 'failed') throw new SafeError('CANVA_JOB_FAILED', 502);
    return job;
  }
}

export class WorkflowService {
  constructor(private repo: WorkflowRepository, private oauth: CanvaService, private provider: WorkflowProvider) {}
  async start(actor: Actor, input: Record<string, unknown>) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(String(input.request_id)) || !uuid.test(String(input.template_id)) ||
      !Array.isArray(input.item_ids) || input.item_ids.length < 1 || input.item_ids.length > 5 ||
      !input.item_ids.every(id => typeof id === 'string' && uuid.test(id))) throw new SafeError('CANVA_INPUT_INVALID');
    return await this.repo.transition('start', actor, {
      request_id: input.request_id, template_id: input.template_id, item_ids: input.item_ids,
    });
  }
  async advance(actor: Actor, runId: string) {
    const lease = crypto.randomUUID();
    const claim = await this.repo.transition('claim', actor, { run_id: runId, lease_id: lease });
    if (claim.result !== 'claimed') return claim;
    const run = claim.run as Run;
    const template = claim.template as Template;
    try {
      if (!run.products.every(p => validSource(p.image_url))) throw new SafeError('CANVA_IMAGE_SOURCE_DENIED', 403);
      const token = await this.oauth.getValidCanvaAccessToken(actor, run.connection_id);
      await this.provider.validate(token, template);
      const pending = run.assets.findIndex(a => !a.asset_id);
      if (pending >= 0) {
        const job = await this.provider.job(token, `url-asset-uploads/${encodeURIComponent(run.assets[pending].job_id)}`);
        if (job.status === 'success') {
          if (!job.asset?.id) throw new SafeError('CANVA_PROVIDER_RESPONSE_INVALID', 502);
          run.assets[pending].asset_id = job.asset.id;
        }
      } else if (run.assets.length < run.products.length) {
        const product = run.products[run.assets.length];
        const job = await this.provider.job(token, 'url-asset-uploads', { name: product.name, url: product.image_url });
        run.assets.push({ job_id: job.id, ...(job.asset?.id ? { asset_id: job.asset.id } : {}) });
        run.status = 'asset_uploading';
      } else if (!run.autofill_job_id) {
        const data: Record<string, unknown> = {};
        run.products.forEach((p, i) => {
          data[`product_${i + 1}_image`] = { type: 'image', asset_id: run.assets[i].asset_id };
          data[`product_${i + 1}_name`] = { type: 'text', text: p.name };
          data[`product_${i + 1}_price`] = { type: 'text', text: `৳${p.price}` };
        });
        const job = await this.provider.job(token, 'autofills', {
          type: 'create_from_brand_template', brand_template_id: template.canva_template_id,
          title: 'Lucky Store product design', data,
        });
        run.autofill_job_id = job.id; run.status = 'autofilling';
      } else {
        const job = await this.provider.job(token, `autofills/${encodeURIComponent(run.autofill_job_id)}`);
        if (job.status === 'success') {
          if (!job.result?.design?.id) throw new SafeError('CANVA_PROVIDER_RESPONSE_INVALID', 502);
          run.design_id = job.result.design.id; run.status = 'design_ready';
        }
      }
    } catch (error) {
      run.status = 'failed';
      run.error_code = error instanceof SafeError ? error.code : 'CANVA_OPERATION_FAILED';
    }
    // Persist once under the claimed lease. Ambiguous creates are never retried.
    return this.repo.transition('save', actor, {
      run_id: runId, lease_id: lease, assets: run.assets, status: run.status,
      autofill_job_id: run.autofill_job_id ?? null, design_id: run.design_id ?? null,
      error_code: run.error_code ?? null,
    });
  }
}
