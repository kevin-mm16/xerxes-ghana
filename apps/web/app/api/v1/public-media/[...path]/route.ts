import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const allowed =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(asset|thumbnail)$/i;
const safeHeaders = [
  "Content-Type",
  "Content-Length",
  "Content-Range",
  "Accept-Ranges",
  "Content-Disposition",
  "X-Content-Type-Options",
  "Cross-Origin-Resource-Policy",
  "Content-Security-Policy",
  "X-Robots-Tag",
];

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const route = (await context.params).path.join("/");
  if (!allowed.test(route) || request.nextUrl.search)
    return NextResponse.json(
      { detail: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);
  try {
    const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
    const response = await fetch(`${base}/api/v1/public-media/${route}`, {
      method: request.method,
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(310000)]),
    });
    const output = new Headers({ "Cache-Control": "no-store" });
    for (const name of safeHeaders) {
      const value = response.headers.get(name);
      if (value) output.set(name, value);
    }
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      headers: output,
    });
  } catch {
    return NextResponse.json(
      { detail: "Public media is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = proxy;
export const HEAD = proxy;
