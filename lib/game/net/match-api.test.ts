import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/match/route";

describe("POST /api/match", () => {
  const previous = process.env.MATCH_SERVER_URL;

  afterEach(() => {
    if (previous === undefined) delete process.env.MATCH_SERVER_URL;
    else process.env.MATCH_SERVER_URL = previous;
  });

  it("returns 503 JSON when no match server is configured", async () => {
    delete process.env.MATCH_SERVER_URL;
    const response = await POST();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "match_server_unavailable" });
  });
});
