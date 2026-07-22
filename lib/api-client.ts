"use client";

// Shared client-side fetch wrapper for /api/* calls. Exists because most of
// those routes don't exist yet (Phase 3 not built) — an un-guarded
// `res.json()` on Next's HTML 404 page throws
// `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`, and that raw
// parse error was leaking straight into toasts/UI. This never lets that
// happen: every failure path (network error, non-OK status, non-JSON body,
// malformed JSON) becomes a clean ApiError with a human-readable message.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseJsonSafely(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function friendlyErrorFrom(body: unknown, status: number): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error?: unknown }).error;
    if (typeof err === "string" && err) return err;
  }
  return status === 404 ? "This feature isn't available yet." : "Something went wrong. Please try again.";
}

/** Fetch + parse JSON, throwing a friendly ApiError instead of a raw parse/network error. */
export async function apiFetch<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new ApiError("Network error. Please check your connection and try again.", 0);
  }

  const body = await parseJsonSafely(res);

  if (!res.ok) {
    throw new ApiError(friendlyErrorFrom(body, res.status), res.status);
  }

  if (body === null) {
    // 2xx with no/non-JSON body — treat as an empty success rather than throwing.
    return undefined as T;
  }

  return body as T;
}

/** Same as apiFetch, but for endpoints returning a file (e.g. CSV export/download). */
export async function apiFetchBlob(input: string, init?: RequestInit): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new ApiError("Network error. Please check your connection and try again.", 0);
  }
  if (!res.ok) {
    const body = await parseJsonSafely(res);
    throw new ApiError(friendlyErrorFrom(body, res.status), res.status);
  }
  return res.blob();
}

/** Convenience for call sites that just want a message string out of any thrown error. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  return err instanceof ApiError ? err.message : fallback;
}
