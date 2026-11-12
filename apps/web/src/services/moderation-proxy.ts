import type { NextRequest } from "next/server";

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const observation = new RegExp(`^observations/${uuid}$`);
const mutation = new RegExp(
  `^observations/${uuid}/(assign|location|draft|decision|prepare-media|publish|withdraw)$`,
);
const location = new RegExp(`^observations/${uuid}/public-location$`);
const media = new RegExp(
  `^observations/${uuid}/media/(review|thumbnail|original)$`,
);
const jsonLimit = 64 * 1024;

function failure(detail: string, status: number) {
  return Response.json(
    { detail },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function proxyReviewerRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  scope: "auth" | "moderation",
) {
  const route = (await context.params).path.join("/");
  const binary = scope === "moderation" && media.test(route);
  const expected =
    scope === "auth"
      ? route === "session"
        ? "GET"
        : ["login", "logout"].includes(route)
          ? "POST"
          : undefined
      : binary
        ? "MEDIA"
        : route === "observations" ||
            observation.test(route) ||
            location.test(route)
          ? "GET"
          : mutation.test(route)
            ? "POST"
            : undefined;
  if (!expected) return failure("Not found", 404);
  if (
    expected === "MEDIA"
      ? !["GET", "HEAD"].includes(request.method)
      : request.method !== expected
  )
    return failure("Method not allowed", 405);
  if (
    request.nextUrl.search &&
    (scope !== "moderation" || route !== "observations")
  )
    return failure("Query parameters are not supported", 400);
  for (const [key, value] of request.nextUrl.searchParams) {
    if (!["limit", "offset"].includes(key) || !/^\d{1,6}$/.test(value))
      return failure("Unsupported queue query", 400);
  }

  const headers = new Headers({ Accept: binary ? "*/*" : "application/json" });
  // Preserve the actual browser Origin. Substituting the proxy's origin would
  // turn it into a CSRF bypass. Cookies/capabilities never enter a query string.
  for (const name of ["Cookie", "Origin", "X-CSRF-Token", "Sec-Fetch-Site"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (binary && request.headers.has("range"))
    headers.set("Range", request.headers.get("range")!);
  let body: Uint8Array | undefined;
  if (request.method === "POST") {
    if (
      request.headers.get("content-type")?.split(";")[0].trim() !==
      "application/json"
    )
      return failure("JSON is required", 415);
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > jsonLimit) {
          await reader.cancel();
          return failure("Request is too large", 413);
        }
        chunks.push(chunk.value);
      }
    body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), binary ? 300000 : 20000);
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const cleanup = () => {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
  };
  try {
    const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
    const upstream = await fetch(
      `${base}/api/v1/${scope}/${route}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: body as BodyInit | undefined,
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
      },
    );
    const outgoing = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of [
      "Content-Type",
      "Content-Length",
      "Content-Range",
      "Accept-Ranges",
      "Content-Disposition",
      "Retry-After",
    ])
      if (upstream.headers.has(name))
        outgoing.set(name, upstream.headers.get(name)!);
    const cookies =
      upstream.headers.getSetCookie?.() ??
      (upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie")!]
        : []);
    for (const cookie of cookies) outgoing.append("Set-Cookie", cookie);
    if (
      !upstream.body ||
      request.method === "HEAD" ||
      upstream.status === 204 ||
      upstream.status === 304
    ) {
      cleanup();
      return new Response(null, { status: upstream.status, headers: outgoing });
    }
    const reader = upstream.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(target) {
        try {
          const chunk = await reader.read();
          if (chunk.done) {
            cleanup();
            target.close();
          } else target.enqueue(chunk.value);
        } catch (error) {
          cleanup();
          target.error(error);
        }
      },
      async cancel(reason) {
        cleanup();
        controller.abort();
        await reader.cancel(reason).catch(() => undefined);
      },
    });
    return new Response(stream, { status: upstream.status, headers: outgoing });
  } catch {
    cleanup();
    return failure("The reviewer service is unavailable. Please retry.", 503);
  }
}
