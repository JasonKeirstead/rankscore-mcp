export class RankScoreError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RankScoreError";
  }
}

export interface HttpOptions {
  fetch?: typeof fetch;
  /** Retries on HTTP 429, for GET only. Default 2. */
  maxRetries?: number;
  /** Base delay for 429 backoff when no Retry-After header is sent. Default 1000 ms. */
  retryBaseMs?: number;
  /** Per-request timeout. Default 30000 ms. */
  timeoutMs?: number;
}

export interface ResolvedHttp {
  fetchImpl: typeof fetch;
  maxRetries: number;
  retryBaseMs: number;
  timeoutMs: number;
}

export const resolveHttp = (o: HttpOptions = {}): ResolvedHttp => ({
  fetchImpl: o.fetch ?? fetch,
  maxRetries: o.maxRetries ?? 2,
  retryBaseMs: o.retryBaseMs ?? 1000,
  timeoutMs: o.timeoutMs ?? 30_000,
});

export type StatusHints = Partial<Record<number, string>>;
export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const MAX_RETRY_DELAY_MS = 30_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface JsonRequest {
  method?: Method;
  headers?: Record<string, string>;
  body?: unknown;
}

/** A network failure described without its message: undici quotes header values in messages. */
function describeNetworkError(err: unknown): string {
  const e = err as { name?: string; code?: string; cause?: { code?: string } };
  return e?.cause?.code ?? e?.code ?? e?.name ?? "network error";
}

/**
 * Sends one request. Retries on 429 for GET only: a write that was refused is never replayed
 * behind the caller's back. Returns the response whatever its status.
 */
export async function send(http: ResolvedHttp, url: string, req: JsonRequest = {}): Promise<Response> {
  const method = req.method ?? "GET";
  const retries = method === "GET" ? http.maxRetries : 0;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await http.fetchImpl(url, {
        method,
        headers: { Accept: "application/json", ...(req.body !== undefined ? { "Content-Type": "application/json" } : {}), ...req.headers },
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
        signal: AbortSignal.timeout(http.timeoutMs),
        // Never follow a redirect: it could carry the password, the cookie or the API key to another host.
        redirect: "manual",
      });
    } catch (err) {
      throw new RankScoreError(`Request to RankScore failed (${describeNetworkError(err)}).`);
    }
    if (res.status === 429 && attempt < retries) {
      await res.body?.cancel().catch(() => undefined);
      await sleep(retryDelayMs(http, res, attempt));
      continue;
    }
    return res;
  }
}

function retryDelayMs(http: ResolvedHttp, res: Response, attempt: number): number {
  const header = res.headers.get("retry-after");
  const seconds = header === null ? NaN : Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : http.retryBaseMs * 2 ** attempt;
  return Math.min(ms, MAX_RETRY_DELAY_MS);
}

/** Parses a JSON body. With allowEmpty, an empty body gives {} (some write endpoints return nothing). */
export async function readJson<T>(res: Response, allowEmpty = false): Promise<T> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    throw new RankScoreError("RankScore returned a response that could not be read.", res.status);
  }
  if (allowEmpty && text.trim() === "") return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RankScoreError("RankScore returned a response that is not valid JSON.", res.status);
  }
}

const DEFAULT_HINTS: Record<number, string> = {
  401: "Unauthorized.",
  404: "Not found.",
  429: "Rate limited. Retry later.",
};

export async function httpError(res: Response, hints: StatusHints = {}): Promise<RankScoreError> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const body = JSON.parse(text) as Record<string, unknown>;
      const field = [body.error, body.msg, body.error_description, body.message].find((v) => typeof v === "string");
      detail = typeof field === "string" ? field : text;
      const extras: string[] = [];
      if (typeof body.limit === "number" || typeof body.limit === "string") extras.push(`limit ${body.limit}`);
      if (typeof body.resetTime === "string" || typeof body.resetTime === "number") extras.push(`resets ${body.resetTime}`);
      if (extras.length && typeof field === "string") detail += ` (${extras.join(", ")})`;
    } catch {
      detail = text;
    }
  } catch {
    // Body unreadable: the status hint below is enough.
  }
  detail = detail.trim().slice(0, 500);
  const hint = hints[res.status] ?? DEFAULT_HINTS[res.status] ?? "RankScore API error.";
  return new RankScoreError(`${hint} [HTTP ${res.status}]${detail ? ` ${detail}` : ""}`, res.status);
}

export async function requestJson<T>(
  http: ResolvedHttp,
  url: string,
  req: JsonRequest,
  hints?: StatusHints,
  allowEmpty = false,
): Promise<T> {
  const res = await send(http, url, req);
  if (!res.ok) throw await httpError(res, hints);
  return readJson<T>(res, allowEmpty);
}
