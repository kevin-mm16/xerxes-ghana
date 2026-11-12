// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as authGet,
  POST as authPost,
} from "../app/api/v1/auth/[...path]/route";
import { GET, HEAD, POST } from "../app/api/v1/moderation/[...path]/route";

const id = "a7218b1c-8d89-4d26-80dc-40f3f40546b5";
const context = (...path: string[]) => ({ params: Promise.resolve({ path }) });
const input = (
  scope: string,
  route: string,
  method = "GET",
  body?: BodyInit,
  headers: Record<string, string> = {},
) =>
  new NextRequest(`http://localhost:3000/api/v1/${scope}/${route}`, {
    method,
    body,
    headers,
    duplex: "half",
  } as NonNullable<ConstructorParameters<typeof NextRequest>[1]>);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("preserves browser origin and session cookie, returns real server cookie without caching", async () => {
  const fetch = vi.fn(
    async (_url: RequestInfo | URL, _options?: RequestInit) =>
      new Response(JSON.stringify({ authenticated: true }), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie":
            "xerxes_session=opaque; HttpOnly; Path=/api/v1; SameSite=Lax",
        },
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const response = await authPost(
    input(
      "auth",
      "login",
      "POST",
      JSON.stringify({
        username: "synthetic-reviewer",
        password: "not-a-real-credential",
      }),
      {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: "xerxes_session=previous",
      },
    ),
    context("login"),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ authenticated: true });
  const options = fetch.mock.calls[0][1] as RequestInit;
  const forwarded = new Headers(options.headers);
  expect(forwarded.get("Origin")).toBe("http://localhost:3000");
  expect(forwarded.get("Cookie")).toBe("xerxes_session=previous");
  expect(options.redirect).toBe("error");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

it("does not manufacture trusted origins or conceal upstream CSRF failures", async () => {
  const fetch = vi.fn(async (_url: RequestInfo | URL, _options?: RequestInit) =>
    Response.json(
      { detail: "A trusted browser origin is required" },
      { status: 403 },
    ),
  );
  vi.stubGlobal("fetch", fetch);
  const response = await POST(
    input("moderation", `observations/${id}/publish`, "POST", "{}", {
      "Content-Type": "application/json",
      Cookie: "xerxes_session=opaque",
      "X-CSRF-Token": "session-csrf",
    }),
    context("observations", id, "publish"),
  );
  expect(response.status).toBe(403);
  const forwarded = new Headers(
    (fetch.mock.calls[0][1] as RequestInit).headers,
  );
  expect(forwarded.get("Origin")).toBeNull();
  expect(forwarded.get("X-CSRF-Token")).toBe("session-csrf");
  expect(forwarded.get("Authorization")).toBeNull();
  await response.text();
});

it("streams authenticated range media with only safe response headers", async () => {
  const fetch = vi.fn(
    async (_url: RequestInfo | URL, _options?: RequestInit) =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": "3",
          "Content-Range": "bytes 0-2/99",
          "Accept-Ranges": "bytes",
          "X-Original-Key": "PRIVATE_STORAGE_KEY",
        },
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const response = await GET(
    input("moderation", `observations/${id}/media/review`, "GET", undefined, {
      Cookie: "xerxes_session=opaque",
      Range: "bytes=0-2",
    }),
    context("observations", id, "media", "review"),
  );
  expect(response.status).toBe(206);
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(
    new Uint8Array([1, 2, 3]),
  );
  expect(
    new Headers((fetch.mock.calls[0][1] as RequestInit).headers).get("Range"),
  ).toBe("bytes=0-2");
  expect(response.headers.get("Content-Range")).toBe("bytes 0-2/99");
  expect(response.headers.get("X-Original-Key")).toBeNull();
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

it("rejects arbitrary object paths, query capabilities and invalid route methods before fetch", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(
    (
      await GET(
        input("moderation", "objects/private-original"),
        context("objects", "private-original"),
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await GET(
        input("moderation", `observations/${id}/media/review?key=private`),
        context("observations", id, "media", "review"),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await GET(
        input("moderation", `observations/${id}/publish`),
        context("observations", id, "publish"),
      )
    ).status,
  ).toBe(405);
  expect(
    (await authGet(input("auth", "session?token=private"), context("session")))
      .status,
  ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});

it("limits private JSON and refuses non-JSON browser mutations", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(
    (
      await POST(
        input(
          "moderation",
          `observations/${id}/draft`,
          "POST",
          "x".repeat(65537),
          { "Content-Type": "application/json" },
        ),
        context("observations", id, "draft"),
      )
    ).status,
  ).toBe(413);
  expect(
    (
      await authPost(
        input("auth", "login", "POST", "username=reviewer", {
          "Content-Type": "application/x-www-form-urlencoded",
        }),
        context("login"),
      )
    ).status,
  ).toBe(415);
  expect(fetch).not.toHaveBeenCalled();
});

it("preserves private authorization failures and HEAD metadata without body", async () => {
  const fetch = vi.fn(async (_url: RequestInfo | URL, _options?: RequestInit) =>
    Response.json(
      { detail: "Reviewer authentication is required" },
      { status: 401 },
    ),
  );
  vi.stubGlobal("fetch", fetch);
  const denied = await GET(
    input("moderation", `observations/${id}`),
    context("observations", id),
  );
  expect(denied.status).toBe(401);
  await denied.text();
  fetch.mockImplementationOnce(
    async () =>
      new Response(null, {
        headers: { "Content-Type": "video/mp4", "Content-Length": "99" },
      }),
  );
  const head = await HEAD(
    input("moderation", `observations/${id}/media/review`, "HEAD"),
    context("observations", id, "media", "review"),
  );
  expect(head.headers.get("Content-Length")).toBe("99");
  expect(await head.text()).toBe("");
});
