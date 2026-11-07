const manifestPrefix =
  /^\s*globalThis\.__RSC_MANIFEST\s*=\s*(?:\(\s*globalThis\.__RSC_MANIFEST\s*\|\|\s*\{\s*\}\s*\)|globalThis\.__RSC_MANIFEST\s*\|\|\s*\{\s*\})\s*;\s*globalThis\.__RSC_MANIFEST\[/;

function hasOwnProtoKey(value) {
  if (value === null || typeof value !== 'object') return false;
  if (Object.hasOwn(value, '__proto__')) return true;
  return Object.values(value).some(hasOwnProtoKey);
}

/**
 * Parses only Next-generated client-reference manifests. Any unrecognized or
 * executable shape returns null so Next can keep its isolated VM fallback.
 */
function parseClientReferenceManifest(source, deploymentId) {
  if (source.includes('__proto__')) return null;

  const prefix = manifestPrefix.exec(source);
  if (!prefix) return null;

  const keyStart = prefix[0].length;
  if (source[keyStart] !== '"') return null;

  let keyEnd = keyStart + 1;
  while (keyEnd < source.length && source[keyEnd] !== '"') {
    keyEnd += source[keyEnd] === '\\' ? 2 : 1;
  }
  if (keyEnd >= source.length) return null;

  const keyLiteral = source.slice(keyStart, keyEnd + 1);
  const assignmentSeparator = /\s*\]\s*=\s*/y;
  assignmentSeparator.lastIndex = keyEnd + 1;
  if (!assignmentSeparator.test(source)) return null;

  const rest = source.slice(assignmentSeparator.lastIndex);
  const lineBreak = rest.search(/[\r\n]/);
  const assignment = (lineBreak === -1 ? rest : rest.slice(0, lineBreak)).trimEnd();
  const suffix = lineBreak === -1 ? '' : rest.slice(lineBreak);
  const body = assignment.endsWith(';') ? assignment.slice(0, -1) : assignment;

  if (!body || suffix.trim()) return null;

  try {
    const key = JSON.parse(keyLiteral);
    const value = JSON.parse(body);
    if (key === '__proto__' || hasOwnProtoKey(value)) return null;

    return {
      process: { env: { NEXT_DEPLOYMENT_ID: deploymentId } },
      __RSC_MANIFEST: { [key]: value },
    };
  } catch {
    return null;
  }
}

module.exports = { parseClientReferenceManifest };
