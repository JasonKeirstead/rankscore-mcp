import { assertHeaderSafe, assertSecureUrl } from "./config.js";
import { requestJson, resolveHttp, RankScoreError, type HttpOptions, type ResolvedHttp } from "./http.js";

export { RankScoreError };

export const DEFAULT_BASE_URL = "https://dashboard.rankscore.co/api/integrations/v1";

export type Article = Record<string, unknown>;

export interface RankScoreClientOptions extends HttpOptions {
  apiKey: string;
  baseUrl?: string;
}

const HINTS = {
  401: "Unauthorized. Check RANKSCORE_API_KEY and that the key was not revoked.",
  404: "Not found. The article may still be generating, or its ID does not belong to this project's API key.",
  429: "Rate limited (60 requests per minute per API key). Retry later.",
};

/** Client for the documented, API-key based integrations API. */
export class RankScoreClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly http: ResolvedHttp;

  constructor(opts: RankScoreClientOptions) {
    if (!opts.apiKey) throw new Error("A RankScore API key is required.");
    assertHeaderSafe("The RankScore API key", opts.apiKey);
    this.apiKey = opts.apiKey;
    this.baseUrl = assertSecureUrl("RANKSCORE_API_BASE", opts.baseUrl ?? DEFAULT_BASE_URL).href.replace(/\/+$/, "");
    this.http = resolveHttp(opts);
  }

  /** GET /articles. Summaries only: no content_html or content_markdown. */
  listArticles(params: { limit?: number; offset?: number } = {}): Promise<Article[]> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    return this.get<Article[]>(`/articles${qs ? `?${qs}` : ""}`);
  }

  /** GET /articles/:id. Full article, including content_html and content_markdown. */
  getArticle(id: string): Promise<Article> {
    // encodeURIComponent keeps "." and "..", which a URL parser would resolve as dot segments.
    if (id === "." || id === "..") throw new RankScoreError("Invalid article id.");
    return this.get<Article>(`/articles/${encodeURIComponent(id)}`);
  }

  private get<T>(path: string): Promise<T> {
    return requestJson<T>(this.http, `${this.baseUrl}${path}`, { headers: { "X-API-Key": this.apiKey, "Content-Type": "application/json" } }, HINTS);
  }
}
