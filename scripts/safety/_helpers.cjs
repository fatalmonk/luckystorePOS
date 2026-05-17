const { execFileSync } = require('node:child_process');

function run(command, args = [], options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function runResult(command, args = [], options = {}) {
  try {
    return {
      ok: true,
      status: 0,
      stdout: run(command, args, options),
      stderr: '',
    };
  } catch (error) {
    return {
      ok: false,
      status: error.status ?? 1,
      stdout: String(error.stdout || ''),
      stderr: String(error.stderr || error.message || ''),
    };
  }
}

function lines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function redact(text) {
  return String(text)
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[REDACTED_DB_URL]')
    .replace(/SUPABASE_[A-Z_]*KEY[^\s"']*/g, '[REDACTED_KEY]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]');
}

module.exports = { lines, redact, run, runResult };
