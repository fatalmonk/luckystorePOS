/* eslint-disable @typescript-eslint/no-implied-eval */
import type {
  BrowserBinding,
  PageBinding,
  RequestBinding,
} from "../../src/types.ts";

export interface FakeBrowser extends BrowserBinding {
  state: { browserClosed: boolean; pageClosed: boolean };
}

export function createFakeBrowser(htmlByUrl: Map<string, string>): FakeBrowser {
  const state = { browserClosed: false, pageClosed: false };
  return {
    state,
    launch: async () => {
      return {
        close: async () => {
          state.browserClosed = true;
        },
        newPage: async () => createFakePage(htmlByUrl, state),
      };
    },
  };
}

function createFakePage(
  htmlByUrl: Map<string, string>,
  state: FakeBrowser["state"],
): PageBinding {
  let currentHtml = "";
  let intercepting = false;
  const handlers: Array<(req: RequestBinding) => void> = [];

  const page: PageBinding = {
    setViewport: async () => undefined,
    setUserAgent: async () => undefined,
    setRequestInterception: async (enabled: boolean) => {
      intercepting = enabled;
    },
    on: (_event: string, handler: (req: RequestBinding) => void) => {
      handlers.push(handler);
    },
    goto: async (url: string) => {
      currentHtml = htmlByUrl.get(url) ?? "";
      if (intercepting) {
        for (const handler of handlers) {
          handler(fakeRequest("document"));
        }
      }
      return null;
    },
    waitForSelector: async (selector: string) => {
      const dom = new JSDOMShim(currentHtml);
      if (!dom.document.querySelector(selector)) {
        throw new Error(`selector timeout: ${selector}`);
      }
      return {};
    },
    evaluate: async <T, A extends unknown[]>(fn: (...args: A) => T, ...args: A): Promise<T> => {
      const source = fn.toString();
      const dom = new JSDOMShim(currentHtml);
      const wrapped = new Function(
        "document",
        "args",
        `return (${source})(...args);`,
      ) as (document: DocumentShim, fnArgs: A) => T;
      return wrapped(dom.document, args);
    },
    close: async () => {
      state.pageClosed = true;
    },
  };
  return page;
}

function fakeRequest(type: string): RequestBinding {
  return {
    resourceType: () => type,
    abort: async () => undefined,
    continue: async () => undefined,
    url: () => "",
  };
}

class JSDOMShim {
  document: DocumentShim;

  constructor(html: string) {
    this.document = new DocumentShim(html);
  }
}

class DocumentShim {
  private html: string;

  constructor(html: string) {
    this.html = html;
  }

  querySelectorAll(selector: string): ElementShim[] {
    return parseHtml(this.html).querySelectorAll(selector);
  }

  querySelector(selector: string): ElementShim | null {
    const all = this.querySelectorAll(selector);
    return all[0] ?? null;
  }
}

interface ParsedNode {
  tag: string;
  classes: string[];
  attributes: Record<string, string>;
  children: ParsedNode[];
  text: string;
  parent: ParsedNode | null;
}

function parseHtml(html: string): { querySelectorAll: (selector: string) => ElementShim[] } {
  const root: ParsedNode = {
    tag: "__root__",
    classes: [],
    attributes: {},
    children: [],
    text: "",
    parent: null,
  };
  const tagRegex = /<(\/?)([a-zA-Z0-9]+)([^\u003e]*)(\/?)>/g;
  const stack: ParsedNode[] = [root];
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const textBefore = html.slice(lastIndex, match.index).trim();
    if (textBefore.length > 0) {
      const current = stack[stack.length - 1];
      if (current) current.text += (current.text ? " " : "") + textBefore;
    }
    const isClosing = match[1] === "/";
    const tag = match[2]!.toLowerCase();
    const rawAttrs = match[3] ?? "";
    const selfClosing = match[4] === "/" || ["img", "br", "hr", "input", "meta", "link"].includes(tag);

    if (isClosing) {
      stack.pop();
      lastIndex = match.index + match[0].length;
      continue;
    }

    const node: ParsedNode = {
      tag,
      classes: [],
      attributes: {},
      children: [],
      text: "",
      parent: stack[stack.length - 1] ?? null,
    };

    const classMatch = rawAttrs.match(/class="([^"]*)"/);
    if (classMatch) {
      node.classes = (classMatch[1] ?? "").split(/\s+/).filter(Boolean);
    }
    const attrMatches = rawAttrs.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g);
    for (const m of attrMatches) {
      const attributeName = m[1];
      const attributeValue = m[2];
      if (attributeName && attributeValue !== undefined) {
        node.attributes[attributeName] = attributeValue;
      }
    }

    const current = stack[stack.length - 1];
    if (current) current.children.push(node);

    if (!selfClosing) {
      stack.push(node);
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = html.slice(lastIndex).trim();
  if (remaining.length > 0) {
    const current = stack[stack.length - 1];
    if (current) current.text += (current.text ? " " : "") + remaining;
  }

  return {
    querySelectorAll: (selector: string) => selectAll(root, selector),
  };
}

function matches(node: ParsedNode, selector: string): boolean {
  const parts = selector.split(/\s+/);
  let current: ParsedNode | null = node;
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (!current) return false;
    if (!part || !matchesSimple(current, part)) return false;
    current = current.parent;
  }
  return true;
}

function matchesSimple(node: ParsedNode, selector: string): boolean {
  const tagMatch = selector.match(/^([a-z0-9-]+)/);
  const clsMatches = selector.matchAll(/\.([a-zA-Z0-9_-]+)/g);
  const attrMatches = selector.matchAll(/\[([^\]]+)\]/g);
  const tag = tagMatch?.[1]?.toLowerCase() ?? null;
  if (tag && node.tag !== tag) return false;
  for (const cls of clsMatches) {
    const className = cls[1];
    if (!className || !node.classes.includes(className)) return false;
  }
  for (const attr of attrMatches) {
    const attrName = attr[1];
    if (!attrName) return false;
    if (attrName.startsWith("href^=")) {
      const prefix = attrName.match(/^href\^="([^"]*)"$/)?.[1];
      if (prefix === undefined || !node.attributes.href?.startsWith(prefix)) return false;
    } else if (attrName.startsWith("href")) {
      // not used
    } else if (!node.attributes[attrName]) {
      return false;
    }
  }
  return true;
}

function selectAll(root: ParsedNode, selector: string): ElementShim[] {
  const results: ElementShim[] = [];
  walk(root, (node) => {
    if (matches(node, selector)) {
      results.push(new ElementShim(node));
    }
  });
  return results;
}

function walk(node: ParsedNode, cb: (n: ParsedNode) => void) {
  for (const child of node.children) {
    cb(child);
    walk(child, cb);
  }
}

class ElementShim {
  private node: ParsedNode;

  constructor(node: ParsedNode) {
    this.node = node;
  }

  get textContent(): string {
    return collectText(this.node);
  }

  get childNodes(): Array<{ textContent: string }> {
    return this.node.children.map((child) => ({ textContent: collectText(child) }));
  }

  querySelector(selector: string): ElementShim | null {
    const all = selectAll(this.node, selector);
    return all[0] ?? null;
  }

  querySelectorAll(selector: string): ElementShim[] {
    return selectAll(this.node, selector);
  }

  getAttribute(name: string): string | null {
    return this.node.attributes[name] ?? null;
  }

  get src(): string {
    return this.node.attributes.src ?? "";
  }
}

function collectText(node: ParsedNode): string {
  let text = node.text;
  for (const child of node.children) {
    text += (text ? " " : "") + collectText(child);
  }
  return text.trim();
}
