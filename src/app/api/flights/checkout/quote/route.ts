import { quoteCheckout } from "@/features/sandbox-checkout/checkout.server";
import { readDemoRequest, demoApiError } from "@/lib/api-guard.server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    return Response.json(
      await quoteCheckout(await readDemoRequest(request), request.signal),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return demoApiError(error);
  }
}
