import { applySecurityHeaders } from './headers.js';
import { validateJwt, validateRole } from './auth.js';
import { checkRateLimit } from './rateLimit.js';
import { auditLog } from './audit.js';
import { proxyRequest } from './proxy.js';
import { getDataCorsHeaders, publicCorsHeaders } from './cors.js';
import { handleAuthMd, handleRobotsTxt, handleOpenApiJson, handleHealth, handleHealthz, handleOAuthProtectedResource, handleOAuthAuthorizationServer } from './well-known.js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  NEON_PROXY_API_KEY: string;
  NEON_PROXY_URL: string;
  IMAGES_WORKER_URL: string;
  OAUTH_METADATA_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const origin = request.headers.get('Origin') || '';
    const requestId = crypto.randomUUID();

    if (!env.NEON_PROXY_URL.startsWith('https://')) {
      return new Response('NEON_PROXY_URL must use HTTPS', { status: 500 });
    }

    const applyHeaders = (response: Response): Response => {
      const newHeaders = new Headers(response.headers);
      applySecurityHeaders(newHeaders);
      return new Response(response.body, { status: response.status, headers: newHeaders });
    };

    if (pathname === '/auth.md') {
      const response = await handleAuthMd();
      return applyHeaders(response);
    }
    if (pathname === '/robots.txt') {
      const response = await handleRobotsTxt();
      return applyHeaders(response);
    }
    if (pathname === '/openapi.json') {
      const response = await handleOpenApiJson();
      return applyHeaders(response);
    }
    if (pathname === '/health') {
      const response = await handleHealth();
      return applyHeaders(response);
    }
    if (pathname === '/healthz') {
      const response = await handleHealthz(env);
      return applyHeaders(response);
    }
    if (pathname === '/.well-known/oauth-protected-resource') {
      const response = await handleOAuthProtectedResource(env);
      return applyHeaders(response);
    }
    if (pathname === '/.well-known/oauth-authorization-server') {
      const response = handleOAuthAuthorizationServer(env.SUPABASE_URL);
      return applyHeaders(response);
    }

    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      const corsHeaders = getDataCorsHeaders(origin);
      return new Response(null, { headers: corsHeaders });
    }

    if (pathname.startsWith('/api/')) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rateLimit = checkRateLimit(ip);
      if (!rateLimit.allowed) {
        auditLog('rate_limit', { requestId, ip, path: pathname });
        const corsHeaders = getDataCorsHeaders(origin);
        return applyHeaders(new Response('Too Many Requests', {
          status: 429,
          headers: { ...corsHeaders, 'Retry-After': '60', 'x-request-id': requestId },
        }));
      }

      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        auditLog('auth_fail', { requestId, ip, path: pathname, reason: 'missing token' });
        const corsHeaders = getDataCorsHeaders(origin);
        return applyHeaders(new Response('Unauthorized', {
          status: 401,
          headers: { ...corsHeaders, 'x-request-id': requestId },
        }));
      }

      const token = authHeader.slice('Bearer '.length);
      let payload;
      try {
        payload = await validateJwt(token, env);
      } catch (err) {
        auditLog('auth_fail', { requestId, ip, path: pathname, reason: 'invalid JWT' });
        const corsHeaders = getDataCorsHeaders(origin);
        return applyHeaders(new Response('Unauthorized', {
          status: 401,
          headers: { ...corsHeaders, 'x-request-id': requestId },
        }));
      }

      if (!validateRole(payload, 'worker_agent')) {
        auditLog('role_fail', { requestId, ip, path: pathname, reason: 'missing worker_agent role' });
        const corsHeaders = getDataCorsHeaders(origin);
        return applyHeaders(new Response('Forbidden', {
          status: 403,
          headers: { ...corsHeaders, 'x-request-id': requestId },
        }));
      }

      let upstreamUrl;
      if (pathname.startsWith('/api/neon/')) {
        upstreamUrl = env.NEON_PROXY_URL + pathname.slice('/api/neon'.length);
      } else if (pathname.startsWith('/api/images/')) {
        upstreamUrl = env.IMAGES_WORKER_URL + pathname.slice('/api/images'.length);
      } else {
        const corsHeaders = getDataCorsHeaders(origin);
        return applyHeaders(new Response('Not Found', {
          status: 404,
          headers: { ...corsHeaders, 'x-request-id': requestId },
        }));
      }

      const response = await proxyRequest(upstreamUrl, request, env.NEON_PROXY_API_KEY, requestId);
      auditLog('proxy_ok', { requestId, ip, path: pathname });
      return applyHeaders(response);
    }

    const corsHeaders = publicCorsHeaders();
    return applyHeaders(new Response('Not Found', {
      status: 404,
      headers: { ...corsHeaders, 'x-request-id': requestId },
    }));
  },
};
