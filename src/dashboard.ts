import { assertHeaderSafe, assertSecureUrl } from "./config.js";
import {
  httpError,
  readJson,
  requestJson,
  resolveHttp,
  send,
  RankScoreError,
  type HttpOptions,
  type Method,
  type ResolvedHttp,
} from "./http.js";
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL } from "./supabase-defaults.js";

export const DEFAULT_DASHBOARD_ORIGIN = "https://dashboard.rankscore.co";

/** The session object Supabase Auth returns. The dashboard keeps it, whole, in a cookie. */
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  [key: string]: unknown;
}

export interface DashboardClientOptions extends HttpOptions {
  email: string;
  password: string;
  origin?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  /** Clock in milliseconds. For tests. */
  now?: () => number;
}

/** Cookie chunk size used by @supabase/ssr (URL-encoded characters). */
const COOKIE_CHUNK = 3180;
/**
 * Renew the session this long before it expires. It is above the 90 s margin in which the
 * dashboard's own server code would refresh the session itself and use up our refresh token.
 */
const EXPIRY_SKEW_MS = 120_000;
/** After a failed login, or a data 401 that survived a fresh login, wait before trying again. */
const COOLDOWN_MS = 30_000;
/** Refresh answers that mean "this refresh token is no good": only these fall back to the password. */
const TOKEN_REJECTED = new Set([400, 401, 403, 422]);

const LOGIN_HINT = "RankScore login failed. Check RANKSCORE_EMAIL and RANKSCORE_PASSWORD (or the credentials file).";
const LOGIN_HINTS = { 400: LOGIN_HINT, 401: LOGIN_HINT, 422: LOGIN_HINT, 429: "RankScore login is rate limited. Retry later." };
const DASHBOARD_HINTS = {
  401: "RankScore rejected the login session. Check RANKSCORE_EMAIL and RANKSCORE_PASSWORD.",
  404: "Not found. Check the project id and the other ids.",
  429: "Rate limited or out of quota at RankScore.",
};

/** Builds the Cookie header the dashboard's Supabase client would send: name, `base64-` prefix, chunks. */
export function sessionCookieHeader(supabaseUrl: string, session: Session): string {
  const name = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  // The base64url alphabet needs no percent-encoding, so a chunk is a plain slice.
  if (value.length <= COOKIE_CHUNK) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0, n = 0; i < value.length; i += COOKIE_CHUNK, n++) {
    parts.push(`${name}.${n}=${value.slice(i, i + COOKIE_CHUNK)}`);
  }
  return parts.join("; ");
}

/**
 * Client for the dashboard's own JSON API (`/api/projects/...`).
 * It signs in with the account email and password through Supabase Auth, as the login page does,
 * keeps the session in memory only, and sends it as the same cookie the browser sends.
 * These endpoints are not documented by RankScore and can change without notice.
 */
export class DashboardClient {
  private readonly email: string;
  private readonly password: string;
  private readonly origin: string;
  private readonly supabaseUrl: string;
  private readonly anonKey: string;
  private readonly http: ResolvedHttp;
  /** Token calls are never retried: a retry would send the password again. */
  private readonly authHttp: ResolvedHttp;
  private readonly now: () => number;
  private session?: Session;
  /** Local time (ms) at which the session expires: receipt time plus expires_in. The server clock is not used. */
  private deadline = 0;
  private renewing?: Promise<Session>;
  private blocked?: { until: number; error: RankScoreError };

  constructor(opts: DashboardClientOptions) {
    if (!opts.email || !opts.password) throw new Error("A RankScore email and password are required.");
    this.email = opts.email;
    this.password = opts.password;
    this.origin = assertSecureUrl("RANKSCORE_DASHBOARD_ORIGIN", opts.origin ?? DEFAULT_DASHBOARD_ORIGIN).origin;
    this.supabaseUrl = assertSecureUrl("RANKSCORE_SUPABASE_URL", opts.supabaseUrl ?? DEFAULT_SUPABASE_URL).origin;
    this.anonKey = opts.supabaseAnonKey ?? DEFAULT_SUPABASE_ANON_KEY;
    assertHeaderSafe("RANKSCORE_SUPABASE_ANON_KEY", this.anonKey);
    this.http = resolveHttp(opts);
    this.authHttp = { ...this.http, maxRetries: 0 };
    this.now = opts.now ?? Date.now;
  }

  /** GET a dashboard path such as `/api/projects/<id>/content-plan`. */
  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  /**
   * Calls a dashboard path. A 401 means the call was not processed, so it is safe to repeat once
   * after a fresh login, writes included. An empty success body gives {}.
   */
  async request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    this.assertNotBlocked();
    const url = `${this.origin}${path}`;
    let rejected: Session | undefined;
    for (let attempt = 0; ; attempt++) {
      const session = await this.getSession(rejected);
      const res = await send(this.http, url, { method, body, headers: { Cookie: sessionCookieHeader(this.supabaseUrl, session) } });
      if (res.status === 401) {
        if (attempt === 0) {
          await res.body?.cancel().catch(() => undefined);
          rejected = session;
          continue;
        }
        const error = await httpError(res, DASHBOARD_HINTS);
        this.block(error);
        throw error;
      }
      if (!res.ok) throw await httpError(res, DASHBOARD_HINTS);
      return readJson<T>(res, method !== "GET");
    }
  }

  private assertNotBlocked(): void {
    if (!this.blocked) return;
    if (this.now() < this.blocked.until) throw this.blocked.error;
    this.blocked = undefined;
  }

  private block(error: RankScoreError): void {
    this.blocked = { until: this.now() + COOLDOWN_MS, error };
  }

  private getSession(rejected?: Session): Promise<Session> {
    if (rejected) {
      // Another call may already have replaced the session this one was rejected with.
      if (this.session && this.session !== rejected) return Promise.resolve(this.session);
    } else if (this.session && this.now() < this.deadline - EXPIRY_SKEW_MS) {
      return Promise.resolve(this.session);
    }
    // One renewal at a time: concurrent tool calls share it.
    this.renewing ??= this.renew(rejected !== undefined).finally(() => {
      this.renewing = undefined;
    });
    return this.renewing;
  }

  private async renew(forceLogin: boolean): Promise<Session> {
    if (!forceLogin && this.session?.refresh_token) {
      try {
        return this.store(await this.token("refresh_token", { refresh_token: this.session.refresh_token }));
      } catch (err) {
        // Only an answer that rejects the refresh token falls back to the password.
        // A 429, a 5xx or a network failure is reported as it is.
        if (!(err instanceof RankScoreError && err.status !== undefined && TOKEN_REJECTED.has(err.status))) throw err;
      }
    }
    this.session = undefined;
    try {
      return this.store(await this.token("password", { email: this.email, password: this.password }));
    } catch (err) {
      if (err instanceof RankScoreError && err.status !== undefined) this.block(err);
      throw err;
    }
  }

  private store(session: Session): Session {
    const received = this.now();
    if (typeof session.expires_in === "number") this.deadline = received + session.expires_in * 1000;
    else if (typeof session.expires_at === "number") this.deadline = session.expires_at * 1000;
    else this.deadline = Number.POSITIVE_INFINITY;
    if (session.expires_at === undefined && Number.isFinite(this.deadline)) session.expires_at = Math.floor(this.deadline / 1000);
    return (this.session = session);
  }

  private async token(grant: "password" | "refresh_token", body: Record<string, string>): Promise<Session> {
    let session: Session;
    try {
      session = await requestJson<Session>(
        this.authHttp,
        `${this.supabaseUrl}/auth/v1/token?grant_type=${grant}`,
        { method: "POST", headers: { apikey: this.anonKey, Authorization: `Bearer ${this.anonKey}` }, body },
        LOGIN_HINTS,
      );
    } catch (err) {
      // A server that echoes the submitted login must not get it into an error message.
      if (err instanceof RankScoreError) throw new RankScoreError(this.redact(err.message), err.status);
      throw err;
    }
    if (typeof session?.access_token !== "string" || typeof session.refresh_token !== "string") {
      throw new RankScoreError("RankScore login returned no session.");
    }
    return session;
  }

  private redact(text: string): string {
    let out = text;
    for (const secret of [this.password, this.email]) {
      if (secret) out = out.split(secret).join("***");
    }
    return out;
  }
}
