import { describe, expect, it } from "vitest";
import { RankScoreClient } from "../src/client.js";
import { assertHeaderSafe, ConfigError, loadConfig } from "../src/config.js";
import { EMAIL, PASSWORD, PID } from "./mock-backend.js";

const io = (files: Record<string, string>, mode = 0o600) => ({
  readFileSync: (p: string) => {
    if (!(p in files)) throw Object.assign(new Error("nope"), { code: "ENOENT" });
    return files[p]!;
  },
  statSync: () => ({ mode }),
});

describe("loadConfig", () => {
  it("reads key, email and password from lines 1-3 of the credentials file", () => {
    const { config, warnings } = loadConfig({ RANKSCORE_CREDENTIALS_FILE: "/f" }, io({ "/f": `key123\n${EMAIL}\n${PASSWORD}\n` }));
    expect(config).toMatchObject({ apiKey: "key123", email: EMAIL, password: PASSWORD, enableWrites: false });
    expect(warnings).toEqual([]);
  });

  it("handles CRLF, lone CR and a byte order mark, and keeps spaces inside the password", () => {
    for (const nl of ["\r\n", "\r"]) {
      const { config } = loadConfig({ RANKSCORE_CREDENTIALS_FILE: "/f" }, io({ "/f": `﻿key${nl}${EMAIL}${nl}${PASSWORD}${nl}` }));
      expect(config.apiKey).toBe("key");
      expect(config.email).toBe(EMAIL);
      expect(config.password).toBe(PASSWORD);
    }
  });

  it("accepts a file with only an API key", () => {
    const { config } = loadConfig({ RANKSCORE_CREDENTIALS_FILE: "/f" }, io({ "/f": "onlykey\n" }));
    expect(config).toMatchObject({ apiKey: "onlykey", email: undefined, password: undefined });
  });

  it("treats a blank or whitespace-only password line as no password", () => {
    const { config } = loadConfig({ RANKSCORE_CREDENTIALS_FILE: "/f" }, io({ "/f": "key\n\n   \n" }));
    expect(config.password).toBeUndefined();
    expect(() => loadConfig({ RANKSCORE_CREDENTIALS_FILE: "/f" }, io({ "/f": `key\n${EMAIL}\n   \n` }))).toThrow(/both/);
  });

  it("lets the environment override the file", () => {
    const { config } = loadConfig(
      { RANKSCORE_CREDENTIALS_FILE: "/f", RANKSCORE_API_KEY: "envkey", RANKSCORE_PASSWORD: "envpw" },
      io({ "/f": `filekey\n${EMAIL}\nfilepw\n` }),
    );
    expect(config).toMatchObject({ apiKey: "envkey", email: EMAIL, password: "envpw" });
  });

  it("warns when a file with a password is readable by others, without printing the password", () => {
    const { warnings } = loadConfig({ RANKSCORE_CREDENTIALS_FILE: "/f" }, io({ "/f": `k\n${EMAIL}\n${PASSWORD}\n` }, 0o644), "linux");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("chmod 600");
    expect(warnings[0]).not.toContain(PASSWORD);
  });

  it("reports a missing credentials file with the path and the error code only", () => {
    expect(() => loadConfig({ RANKSCORE_CREDENTIALS_FILE: "/missing" }, io({}))).toThrow(/ENOENT.*\/missing/);
  });

  it("fails when only one of email and password is set", () => {
    expect(() => loadConfig({ RANKSCORE_API_KEY: "k", RANKSCORE_EMAIL: EMAIL })).toThrow(ConfigError);
    expect(() => loadConfig({ RANKSCORE_PASSWORD: "p" })).toThrow(ConfigError);
  });

  it("fails with no credentials at all", () => {
    expect(() => loadConfig({})).toThrow(/No RankScore credentials/);
  });

  it("validates RANKSCORE_PROJECT_ID", () => {
    expect(() => loadConfig({ RANKSCORE_API_KEY: "k", RANKSCORE_PROJECT_ID: "nope" })).toThrow(/UUID/);
    expect(loadConfig({ RANKSCORE_API_KEY: "k", RANKSCORE_PROJECT_ID: PID }).config.projectId).toBe(PID);
  });

  it("treats plugin placeholders that were not filled in as unset", () => {
    const { config } = loadConfig({
      RANKSCORE_API_KEY: "key1",
      RANKSCORE_EMAIL: "${user_config.email}",
      RANKSCORE_PASSWORD: "${user_config.password}",
      RANKSCORE_PROJECT_ID: "${user_config.project_id}",
      RANKSCORE_ENABLE_WRITES: "${user_config.enable_writes}",
      RANKSCORE_CREDENTIALS_FILE: "${user_config.credentials_file}",
    });
    expect(config).toMatchObject({ apiKey: "key1", email: undefined, password: undefined, projectId: undefined, enableWrites: false });
  });

  it("parses RANKSCORE_ENABLE_WRITES and warns when it has no login to use", () => {
    for (const v of ["1", "true", "TRUE", "yes"]) {
      expect(loadConfig({ RANKSCORE_EMAIL: EMAIL, RANKSCORE_PASSWORD: "p", RANKSCORE_ENABLE_WRITES: v }).config.enableWrites).toBe(true);
    }
    for (const v of ["0", "false", "", "no", "2"]) {
      expect(loadConfig({ RANKSCORE_EMAIL: EMAIL, RANKSCORE_PASSWORD: "p", RANKSCORE_ENABLE_WRITES: v }).config.enableWrites).toBe(false);
    }
    const { warnings } = loadConfig({ RANKSCORE_API_KEY: "k", RANKSCORE_ENABLE_WRITES: "1" });
    expect(warnings.join(" ")).toContain("No write tools are enabled");
  });
});

describe("header-safe secrets", () => {
  it("rejects an API key with line breaks, spaces or non-ASCII, and the message does not hold the value", () => {
    // What RANKSCORE_API_KEY="$(cat ~/rankscorekey)" would give: key, email and password joined by newlines.
    const joined = `KEYVALUE123\n${EMAIL}\n${PASSWORD}`;
    for (const bad of [joined, "key with space", "kéy", "k\rey"]) {
      let message = "";
      try {
        loadConfig({ RANKSCORE_API_KEY: bad });
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message, JSON.stringify(bad)).toContain("cannot be sent in an HTTP header");
      expect(message).not.toContain("KEYVALUE123");
      expect(message).not.toContain(PASSWORD);
      expect(message).not.toContain(EMAIL);
    }
    expect(() => assertHeaderSafe("x", "abc123-_.~")).not.toThrow();
  });

  it("rejects such a key in the client too, so a library user is covered", () => {
    expect(() => new RankScoreClient({ apiKey: `KEYVALUE123\nsecond line` })).toThrow(ConfigError);
  });

  it("never puts a header value in the error of a failed request", async () => {
    const client = new RankScoreClient({
      apiKey: "KEYVALUE123",
      baseUrl: "http://127.0.0.1:1/api",
      fetch: async () => {
        // undici quotes the whole header value in this kind of message.
        throw new TypeError('Headers.append: "KEYVALUE123" is an invalid header value.');
      },
    });
    const err = await client.listArticles().catch((e: Error) => e);
    expect((err as Error).message).toContain("Request to RankScore failed");
    expect((err as Error).message).not.toContain("KEYVALUE123");
  });
});

describe("RankScoreClient URL rules", () => {
  it("refuses an API base that is plain http on a remote host, and an invalid one, without echoing them", () => {
    for (const bad of ["http://remote.example/v1", "https://user:HUNTER2@bad host", "nope"]) {
      let message = "";
      try {
        new RankScoreClient({ apiKey: "k", baseUrl: bad });
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message, bad).toContain("RANKSCORE_API_BASE");
      expect(message).not.toContain("HUNTER2");
      expect(message).not.toContain("remote.example");
    }
  });

  it("refuses the article ids . and .. that a URL parser would resolve as dot segments", () => {
    const client = new RankScoreClient({ apiKey: "k", baseUrl: "http://127.0.0.1:1/api" });
    expect(() => client.getArticle("..")).toThrow(/Invalid article id/);
    expect(() => client.getArticle(".")).toThrow(/Invalid article id/);
  });
});
