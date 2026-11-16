'use strict';

/**
 * Optional origin-side authentication for the Hostinger Node.js storefront.
 *
 * Install BEFORE loading Next's standalone server so the guard covers requests
 * excluded from Next middleware, including /api/* and Next's image endpoint.
 *
 * This checks a high-entropy secret injected by Cloudflare's Request Header
 * Transform Rule. It does NOT protect files served directly by Hostinger
 * outside the Node process, and it is not a replacement for user/API auth.
 *
 * Rollout: disabled by default. Enable in Hostinger runtime ONLY after the
 * corresponding Cloudflare origin-request header overwrite is active.
 */
const http = require('node:http');
const { timingSafeEqual } = require('node:crypto');

const HEADER = 'x-lucky-origin-auth';
const ENABLED_ENV = 'LUCKY_ORIGIN_GATE_ENABLED';
const SECRET_ENV = 'LUCKY_ORIGIN_GATE_SECRET';

function validateConfig(enabled, secret) {
  if (enabled !== '1') return false;
  if (typeof secret !== 'string' || secret.length < 43 || secret.length > 512 ||
      !/^[A-Za-z0-9_-]+$/.test(secret)) {
    throw new Error('Origin gate enabled without a valid secret; refusing to start');
  }
  return true;
}

function matchesOriginSecret(candidate, secret) {
  if (typeof candidate !== 'string') return false;
  const supplied = Buffer.from(candidate, 'utf8');
  const expected = Buffer.from(secret, 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function installOriginGate({
  enabled = process.env[ENABLED_ENV],
  secret = process.env[SECRET_ENV],
} = {}) {
  if (!validateConfig(enabled, secret)) return () => {};

  if (http.Server.prototype.__luckyOriginGate) {
    throw new Error('Origin gate already installed; refusing ambiguous reconfiguration');
  }

  const previousEmit = http.Server.prototype.emit;
  http.Server.prototype.emit = function emitWithOriginGuard(event, ...args) {
    if (event !== 'request') return previousEmit.call(this, event, ...args);

    const [request, response] = args;
    const header = request?.headers?.[HEADER];
    if (matchesOriginSecret(header, secret)) {
      return previousEmit.call(this, event, ...args);
    }

    response.statusCode = 403;
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Forbidden');
    return true;
  };

  http.Server.prototype.__luckyOriginGate = true;
  return function uninstallOriginGate() {
    if (http.Server.prototype.__luckyOriginGate) {
      http.Server.prototype.emit = previousEmit;
      delete http.Server.prototype.__luckyOriginGate;
    }
  };
}

installOriginGate();

module.exports = {
  HEADER,
  ENABLED_ENV,
  SECRET_ENV,
  validateConfig,
  matchesOriginSecret,
  installOriginGate,
};
