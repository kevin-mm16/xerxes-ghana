// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD } from "../app/api/v1/public-media/[...path]/route";

afterEach(() => vi.unstubAllGlobals());
const id = "11111111-2222-4333-8444-555555555555";
const context = (parts: string[]) => ({
  params: Promise.resolve({ path: parts }),
});

it("streams only a controlled public asset and forwards video ranges without credentials", async () => {
  const upstream = vi
    .fn()
    .mockResolvedValue(
      new Response("safe video", {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Range": "bytes 0-9/100",
          "Set-Cookie": "private=sentinel",
          "X-Object-Key": "PRIVATE_KEY_SENTINEL",
        },
      }),
    );
  vi.stubGlobal("fetch", upstream);
  const response = await GET(
    new NextRequest(`http://localhost:3000/api/v1/public-media/${id}/asset`, {
      headers: {
        Range: "bytes=0-9",
        Cookie: "xerxes_session=PRIVATE_SESSION_SENTINEL",
        Authorization: "Bearer PRIVATE_TOKEN_SENTINEL",
      },
    }),
    context([id, "asset"]),
  );
  expect(response.status).toBe(206);
  expect(await response.text()).toBe("safe video");
  const options = upstream.mock.calls[0][1];
  expect(options.headers.get("range")).toBe("bytes=0-9");
  expect(options.headers.has("cookie")).toBe(false);
  expect(options.headers.has("authorization")).toBe(false);
  expect(response.headers.has("set-cookie")).toBe(false);
  expect(response.headers.has("x-object-key")).toBe(false);
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("retains publication withdrawal status and returns no body for HEAD", async () => {
  const upstream = vi
    .fn()
    .mockResolvedValue(
      new Response(null, {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", upstream);
  const response = await HEAD(
    new NextRequest(`http://localhost:3000/api/v1/public-media/${id}/asset`, {
      method: "HEAD",
    }),
    context([id, "asset"]),
  );
  expect(response.status).toBe(404);
  expect(await response.text()).toBe("");
  expect(upstream.mock.calls[0][1].method).toBe("HEAD");
});

it("rejects private namespaces, arbitrary keys and query capabilities before contacting the API", async () => {
  const upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
  for (const [parts, query] of [
    [[id, "original"], ""],
    [["..", "quarantine", "original"], ""],
    [[id, "asset"], "?token=PRIVATE_TOKEN"],
  ] as Array<[string[], string]>) {
    const response = await GET(
      new NextRequest(
        `http://localhost:3000/api/v1/public-media/anything${query}`,
      ),
      context(parts),
    );
    expect(response.status).toBe(404);
  }
  expect(upstream).not.toHaveBeenCalled();
});
