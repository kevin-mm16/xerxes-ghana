import type {
  CaptureLocation,
  CoverageResult,
  ObservationInput,
  SubmissionReceipt,
} from "@/types/api";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      credentials: "omit",
      cache: "no-store",
      signal: options.signal ?? AbortSignal.timeout(12000),
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new Error(
      "The service is unavailable. Please retry; your observation has not been sent.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "The request could not be completed. Check the fields and retry.",
    );
  }
  return response.json() as Promise<T>;
}
export const checkCoverage = (capture: CaptureLocation) =>
  apiRequest<CoverageResult>("/coverage/check", {
    method: "POST",
    body: JSON.stringify(capture),
  });
export const submitObservation = (input: ObservationInput) =>
  apiRequest<SubmissionReceipt>("/observations", {
    method: "POST",
    body: JSON.stringify(input),
  });
