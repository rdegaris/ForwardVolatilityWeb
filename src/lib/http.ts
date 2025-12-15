export type JsonFetchOptions = RequestInit & {
  /** If true, throws when HTTP status is not ok */
  requireOk?: boolean;
};

function looksLikeHtml(text: string): boolean {
  const t = text.trimStart().toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<head') || t.startsWith('<body');
}

export async function fetchJsonText(url: string, options?: RequestInit): Promise<{ res: Response; text: string }> {
  const res = await fetch(url, options);
  const text = await res.text();

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html') || looksLikeHtml(text)) {
    throw new Error(
      `Expected JSON at ${url} but got HTML. The JSON file is missing, the dev server is returning index.html, or a proxy is misconfigured.`
    );
  }

  return { res, text };
}

export async function fetchJson<T>(url: string, options?: JsonFetchOptions): Promise<T> {
  const { requireOk = true, ...init } = options || {};

  const { res, text } = await fetchJsonText(url, init);

  if (requireOk && !res.ok) {
    throw new Error(`Failed to load ${url} (${res.status} ${res.statusText})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON at ${url}`);
  }
}
