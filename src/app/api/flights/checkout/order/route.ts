import { createSandboxOrder } from "@/features/sandbox-checkout/checkout.server";
import { readDemoRequest, demoApiError } from "@/lib/api-guard.server";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    return Response.json(
      await createSandboxOrder(await readDemoRequest(request)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return demoApiError(error);
  }
}
