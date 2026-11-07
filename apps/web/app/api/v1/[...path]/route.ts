import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const allowed =
  /^(coverage(?:\/check|\/[0-9a-f-]{36})?|observations(?:\/[0-9a-f-]{36})?|map\/features)$/;
const bodyLimit = 16384;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const route = path.join("/");
  if (!allowed.test(route))
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  if (
    request.method === "POST" &&
    !["coverage/check", "observations"].includes(route)
  ) {
    return NextResponse.json({ detail: "Method not allowed" }, { status: 405 });
  }
  let body: Uint8Array | undefined;
  if (request.method === "POST") {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return NextResponse.json({ detail: "JSON is required" }, { status: 415 });
    }
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > bodyLimit) {
          await reader.cancel();
          return NextResponse.json(
            { detail: "Request is too large" },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
    }
    body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
  }
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  try {
    const upstream = await fetch(
      `${base}/api/v1/${route}${request.nextUrl.search}`,
      {
        method: request.method,
        body: body as BodyInit | undefined,
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { detail: "The API is unavailable. Please retry." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
