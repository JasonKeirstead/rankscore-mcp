import { createServer as createHttpServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Session } from "../src/dashboard.js";

export const EMAIL = "user@example.test";
export const PASSWORD = "s3cret-P@ss word!";
export const ANON = "anon-key-for-tests";
export const PID = "11111111-2222-3333-4444-555555555555";
/** The dashboard cookie name derives from the first label of the Supabase host: "127" for 127.0.0.1. */
export const COOKIE = "sb-127-auth-token";

/** Rebuilds the session from cookie chunks the way @supabase/ssr does. */
export function parseCookie(header: string): Session | null {
  const jar = new Map(header.split("; ").map((p) => [p.slice(0, p.indexOf("=")), p.slice(p.indexOf("=") + 1)]));
  let value = jar.get(COOKIE);
  if (value === undefined) {
    const parts: string[] = [];
    for (let i = 0; jar.has(`${COOKIE}.${i}`); i++) parts.push(jar.get(`${COOKIE}.${i}`)!);
    if (!parts.length) return null;
    value = parts.join("");
  }
  if (!value.startsWith("base64-")) return null;
  try {
    return JSON.parse(Buffer.from(value.slice(7), "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

export interface DashCall {
  url: string;
  method: string;
  cookie: string;
  body: unknown;
}

export interface TokenCall {
  grant: string;
  url: string;
  body: Record<string, string>;
  headers: IncomingMessage["headers"];
}

export interface DashReply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => resolve(s));
  });

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A fake Supabase Auth plus a fake dashboard API, and a third server that must never be contacted. */
export class Backend {
  private http!: Server;
  private other!: Server;
  origin = "";
  supabaseUrl = "";
  otherOrigin = "";

  tokenCalls: TokenCall[] = [];
  dashCalls: DashCall[] = [];
  otherHits: string[] = [];
  validAccess = new Set<string>();
  validRefresh = new Set<string>();
  counter = 0;
  expiresIn = 3600;
  expiresAtOverride: number | undefined;
  sessionExtra: Record<string, unknown> = {};
  rejectDashboard = false;
  refreshStatus: number | undefined;
  passwordStatus: number | undefined;
  tokenRedirect = false;
  echoCredentials = false;
  dashResponder: (call: DashCall) => DashReply = (c) => ({ status: 200, body: { echoed: c.url, method: c.method, body: c.body } });

  reset(): void {
    this.tokenCalls = [];
    this.dashCalls = [];
    this.otherHits = [];
    this.validAccess = new Set();
    this.validRefresh = new Set();
    this.counter = 0;
    this.expiresIn = 3600;
    this.expiresAtOverride = undefined;
    this.sessionExtra = {};
    this.rejectDashboard = false;
    this.refreshStatus = undefined;
    this.passwordStatus = undefined;
    this.tokenRedirect = false;
    this.echoCredentials = false;
    this.dashResponder = (c) => ({ status: 200, body: { echoed: c.url, method: c.method, body: c.body } });
  }

  private issue(): Session {
    this.counter++;
    const s: Session = {
      access_token: `access-${this.counter}`,
      refresh_token: `refresh-${this.counter}`,
      token_type: "bearer",
      expires_in: this.expiresIn,
      ...(this.expiresAtOverride !== undefined ? { expires_at: this.expiresAtOverride } : {}),
      user: { id: "u1", email: EMAIL, ...this.sessionExtra },
    };
    this.validAccess.add(s.access_token);
    this.validRefresh.add(s.refresh_token);
    return s;
  }

  async start(): Promise<void> {
    this.http = createHttpServer(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://x");
      const raw = await readBody(req);
      const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
        res.writeHead(status, { "content-type": "application/json", ...headers });
        res.end(body === undefined ? "" : JSON.stringify(body));
      };

      if (url.pathname === "/auth/v1/token") {
        const grant = url.searchParams.get("grant_type") ?? "";
        const body = JSON.parse(raw || "{}") as Record<string, string>;
        this.tokenCalls.push({ grant, url: req.url ?? "", body, headers: req.headers });
        if (this.tokenRedirect) {
          res.writeHead(307, { location: `${this.otherOrigin}/stolen` });
          return res.end();
        }
        if (req.headers.apikey !== ANON) return send(401, { message: "No API key found in request" });
        if (grant === "password") {
          if (this.passwordStatus !== undefined) return send(this.passwordStatus, { msg: "password grant refused" }, { "retry-after": "0" });
          if (body.email === EMAIL && body.password === PASSWORD) return send(200, this.issue());
          const msg = this.echoCredentials ? `Invalid login for ${body.email} with ${body.password}` : "Invalid login credentials";
          return send(400, { code: 400, error_code: "invalid_credentials", msg });
        }
        if (grant === "refresh_token") {
          if (this.refreshStatus !== undefined) return send(this.refreshStatus, { msg: "refresh failed" });
          if (body.refresh_token && this.validRefresh.delete(body.refresh_token)) return send(200, this.issue());
          return send(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
        }
        return send(400, { msg: "unsupported grant" });
      }

      if (url.pathname.startsWith("/api/redirect")) {
        res.writeHead(307, { location: `${this.otherOrigin}/stolen` });
        return res.end();
      }

      if (url.pathname.startsWith("/api/")) {
        const call: DashCall = {
          url: req.url ?? "",
          method: req.method ?? "",
          cookie: req.headers.cookie ?? "",
          body: raw ? (JSON.parse(raw) as unknown) : undefined,
        };
        this.dashCalls.push(call);
        // A slow endpoint: its answer, a 401 included, arrives after other calls have finished.
        if (url.pathname.startsWith("/api/slow")) await sleep(200);
        const session = parseCookie(call.cookie);
        if (this.rejectDashboard || !session || !this.validAccess.has(session.access_token)) return send(401, { error: "Unauthorized" });
        const r = this.dashResponder(call);
        return send(r.status, r.body, r.headers);
      }
      send(404, { error: "no route" });
    });
    await new Promise<void>((resolve) => this.http.listen(0, "127.0.0.1", resolve));
    this.origin = `http://127.0.0.1:${(this.http.address() as AddressInfo).port}`;
    this.supabaseUrl = this.origin;

    this.other = createHttpServer((req, res) => {
      this.otherHits.push(`${req.method} ${req.url} cookie=${req.headers.cookie ?? ""} apikey=${req.headers["x-api-key"] ?? ""}`);
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
    await new Promise<void>((resolve) => this.other.listen(0, "127.0.0.1", resolve));
    this.otherOrigin = `http://127.0.0.1:${(this.other.address() as AddressInfo).port}`;
  }

  async close(): Promise<void> {
    await Promise.all([this.http, this.other].map((s) => new Promise<void>((resolve) => s.close(() => resolve()))));
  }
}
