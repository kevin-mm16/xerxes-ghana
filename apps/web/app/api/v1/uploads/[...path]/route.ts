import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const jsonLimit = 16384;
const mediaLimit = 50 * 1024 * 1024;
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const uploadPath = new RegExp(`^${uuid}/content$`);
const statusPath = new RegExp(`^${uuid}$`);

function failure(detail: string, status: number) {
  return NextResponse.json(
    { detail },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const route = (await context.params).path.join("/");
  const intent = route === "intents";
  const upload = uploadPath.test(route);
  const status = statusPath.test(route);
  if (!intent && !upload && !status) return failure("Not found", 404);
  const method = intent ? "POST" : upload ? "PUT" : "GET";
  if (request.method !== method) return failure("Method not allowed", 405);
  // Capabilities stay in a header, never in logged URLs or arbitrary query parameters.
  if (request.nextUrl.search)
    return failure("Query parameters are not supported", 400);
  const headers = new Headers();
  if (!intent) {
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [A-Za-z0-9_-]{24,128}$/.test(authorization))
      return failure("Upload permission is required", 401);
    headers.set("Authorization", authorization);
  }

  let body: BodyInit | undefined;
  let exceeded = false;
  let invalidLength = false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), upload ? 310000 : 10000);
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) controller.abort();
  try {
    if (intent || upload) {
      const type = request.headers.get("content-type")?.split(";")[0].trim();
      if (type !== (intent ? "application/json" : "application/octet-stream")) {
        return failure(
          intent ? "JSON is required" : "Raw file bytes are required",
          415,
        );
      }
      if (!request.body) return failure("Request body is required", 400);
      const limit = intent ? jsonLimit : mediaLimit;
      const lengthHeader = request.headers.get("content-length");
      const expected = lengthHeader === null ? undefined : Number(lengthHeader);
      if (
        expected !== undefined &&
        (!/^\d+$/.test(lengthHeader!) ||
          !Number.isSafeInteger(expected) ||
          expected < 1)
      )
        return failure("Invalid content length", 400);
      if (expected !== undefined && expected > limit)
        return failure("Request is too large", 413);
      headers.set(
        "Content-Type",
        intent ? "application/json" : "application/octet-stream",
      );
      if (upload) {
        let size = 0;
        // Applying backpressure here avoids loading an entire private video into
        // Next.js memory. FastAPI independently enforces the upload's exact size.
        body = request.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, stream) {
              size += chunk.byteLength;
              if (size > limit) {
                exceeded = true;
                throw new Error("Upload limit exceeded");
              }
              stream.enqueue(chunk);
            },
            flush() {
              if (expected !== undefined && size !== expected) {
                invalidLength = true;
                throw new Error("Content length mismatch");
              }
            },
          }),
          { signal: controller.signal },
        );
        if (lengthHeader !== null) headers.set("Content-Length", lengthHeader);
      } else {
        const reader = request.body
          .pipeThrough(new TransformStream(), { signal: controller.signal })
          .getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > limit) {
            await reader.cancel();
            return failure("Request is too large", 413);
          }
          chunks.push(chunk.value);
        }
        if (expected !== undefined && size !== expected)
          return failure("Content length mismatch", 400);
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        body = bytes;
      }
    }
    const options: RequestInit & { duplex?: "half" } = {
      method,
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    };
    if (upload) options.duplex = "half";
    const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
    const upstream = await fetch(`${base}/api/v1/uploads/${route}`, options);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    if (exceeded) return failure("Request is too large", 413);
    if (invalidLength) return failure("Content length mismatch", 400);
    return failure("The upload service is unavailable. Please retry.", 503);
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", abort);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
