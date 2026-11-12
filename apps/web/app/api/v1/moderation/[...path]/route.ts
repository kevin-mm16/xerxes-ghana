import { NextRequest } from "next/server";
import { proxyReviewerRequest } from "@/services/moderation-proxy";

export const runtime = "nodejs";
const proxy = (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) => proxyReviewerRequest(request, context, "moderation");
export const GET = proxy;
export const POST = proxy;
export const HEAD = proxy;
