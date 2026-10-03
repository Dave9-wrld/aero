import "server-only";
import { FlightSearchError } from "@/features/flight-results/duffel.server";

const state = globalThis as typeof globalThis & {
  aeroApiBudget?: { start: number; count: number };
};
export async function readDemoRequest(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new FlightSearchError("Open Aero in your browser to continue.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new FlightSearchError("Send a valid JSON request.", 400);
  const now = Date.now();
  if (!state.aeroApiBudget || now - state.aeroApiBudget.start >= 60000)
    state.aeroApiBudget = { start: now, count: 0 };
  if (++state.aeroApiBudget.count > 20)
    throw new FlightSearchError(
      "Too many requests. Wait a minute and try again.",
      429,
    );
  const reader = request.body?.getReader();
  if (!reader) throw new FlightSearchError("Send a valid JSON request.", 400);
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 24000) {
      await reader.cancel();
      throw new FlightSearchError("This request is too large.", 413);
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  try {
    return JSON.parse(body);
  } catch {
    throw new FlightSearchError("Send a valid JSON request.", 400);
  }
}
export function demoApiError(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof FlightSearchError
          ? error.message
          : "This step could not be completed. Please try again.",
    },
    {
      status: error instanceof FlightSearchError ? error.status : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
