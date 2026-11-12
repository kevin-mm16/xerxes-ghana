// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PUT } from "../app/api/v1/uploads/[...path]/route";

const id = "a7218b1c-8d89-4d26-80dc-40f3f40546b5";
const token = "test_private_upload_capability_12345";
const auth = { Authorization: `Bearer ${token}` };
const context = (...path: string[]) => ({ params: Promise.resolve({ path }) });
const request = (
  route: string,
  method: string,
  body?: BodyInit,
  headers: Record<string, string> = {},
) =>
  new NextRequest(`http://localhost:3000/api/v1/uploads/${route}`, {
    method,
    body,
    headers,
    duplex: "half",
  } as NonNullable<ConstructorParameters<typeof NextRequest>[1]>);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("forwards only upload capabilities and streams private bytes without cookies", async () => {
  let forwarded: RequestInit | undefined;
  let bytes: Uint8Array | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      forwarded = options;
      bytes = new Uint8Array(await new Response(options.body).arrayBuffer());
      return Response.json({
        id,
        processingStatus: "quarantined",
        mediaKind: "video",
      });
    }),
  );
  const input = new ReadableStream<Uint8Array>({
    start(stream) {
      stream.enqueue(new Uint8Array([1, 2]));
      stream.enqueue(new Uint8Array([3]));
      stream.close();
    },
  });
  const result = await PUT(
    request(`${id}/content`, "PUT", input, {
      ...auth,
      Cookie: "private-session=do-not-forward",
      "Content-Type": "application/octet-stream",
      "Content-Length": "3",
    }),
    context(id, "content"),
  );
  expect(result.status).toBe(200);
  expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
  expect(forwarded?.body).toBeInstanceOf(ReadableStream);
  expect(new Headers(forwarded?.headers).get("Authorization")).toBe(
    `Bearer ${token}`,
  );
  expect(new Headers(forwarded?.headers).get("Cookie")).toBeNull();
  expect(forwarded?.redirect).toBe("error");
  expect(result.headers.get("Cache-Control")).toBe("no-store");
});

it("rejects missing capabilities and query-string tokens before contacting the API", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect((await GET(request(id, "GET"), context(id))).status).toBe(401);
  expect(
    (
      await GET(
        request(`${id}?token=${token}`, "GET", undefined, auth),
        context(id),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await POST(
        request("other", "POST", "{}", { "Content-Type": "application/json" }),
        context("other"),
      )
    ).status,
  ).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});

it("caps intent JSON and discards any supplied authorization or cookies", async () => {
  const fetch = vi.fn(async (_url: RequestInfo | URL, _options?: RequestInit) =>
    Response.json({ id }),
  );
  vi.stubGlobal("fetch", fetch);
  const large = await POST(
    request("intents", "POST", "{}", {
      "Content-Type": "application/json",
      "Content-Length": "16385",
    }),
    context("intents"),
  );
  expect(large.status).toBe(413);
  expect(fetch).not.toHaveBeenCalled();
  const good = await POST(
    request("intents", "POST", "{}", {
      "Content-Type": "application/json",
      ...auth,
      Cookie: "session=private",
    }),
    context("intents"),
  );
  expect(good.status).toBe(200);
  const headers = new Headers(fetch.mock.calls[0][1]?.headers);
  expect(headers.get("Authorization")).toBeNull();
  expect(headers.get("Cookie")).toBeNull();
});

it("rejects declared oversized videos without reading them", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const response = await PUT(
    request(`${id}/content`, "PUT", new Uint8Array([1]), {
      ...auth,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(50 * 1024 * 1024 + 1),
    }),
    context(id, "content"),
  );
  expect(response.status).toBe(413);
  expect(fetch).not.toHaveBeenCalled();
});

it("also stops unknown-length uploads at the streaming limit", async () => {
  let consumed = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      const reader = (options.body as ReadableStream<Uint8Array>).getReader();
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        consumed += chunk.value.byteLength;
      }
      return Response.json({ id });
    }),
  );
  const chunk = new Uint8Array(25 * 1024 * 1024);
  const body = new ReadableStream<Uint8Array>({
    start(stream) {
      stream.enqueue(chunk);
      stream.enqueue(chunk);
      stream.enqueue(new Uint8Array([1]));
      stream.close();
    },
  });
  const response = await PUT(
    request(`${id}/content`, "PUT", body, {
      ...auth,
      "Content-Type": "application/octet-stream",
    }),
    context(id, "content"),
  );
  expect(response.status).toBe(413);
  expect(consumed).toBeLessThanOrEqual(50 * 1024 * 1024);
});

it("rejects a content-length mismatch and never forwards provider error details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      await new Response(options.body).arrayBuffer();
      return Response.json({ id });
    }),
  );
  const response = await PUT(
    request(`${id}/content`, "PUT", new Uint8Array([1, 2]), {
      ...auth,
      "Content-Type": "application/octet-stream",
      "Content-Length": "1",
    }),
    context(id, "content"),
  );
  expect(response.status).toBe(400);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockRejectedValue(new Error("private storage path and secret token")),
  );
  const unavailable = await GET(
    request(id, "GET", undefined, auth),
    context(id),
  );
  expect(unavailable.status).toBe(503);
  expect(await unavailable.text()).not.toContain("secret");
});
