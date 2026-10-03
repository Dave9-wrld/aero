# Connect the Duffel sandbox journey

## Your setup steps

1. Create an account at [Duffel](https://app.duffel.com). In the dashboard, select **Developer test mode**, then open the Developers / Access tokens section and create a test token with permission to search flights. Dashboard labels may change; follow the [official test-mode guide](https://duffel.com/docs/api/overview/test-mode).
2. In the `aero` directory, open `.env.local`. If it does not exist, copy `.env.example` to `.env.local`.
3. Set `DUFFEL_ACCESS_TOKEN` to your test token. Test tokens begin with `duffel_test_`. Paste the token only into this local file, never into chat or a committed source file.

```dotenv
DUFFEL_ACCESS_TOKEN=your_test_token_here
```

4. Restart the Aero development server from this directory using `npm run dev`.
5. Search in Aero, choose **Duffel sandbox**, then **View flight & seats**. Pick optional seats and bags, check the latest price, and create a test booking with fictional profiles. Duffel Airways is the simplest test choice. Your token needs flight order creation permission as well as search permission.

`.env.local` is ignored by Git. `.env.example` contains no credential and can be committed. Do not change the variable name to `NEXT_PUBLIC_DUFFEL_ACCESS_TOKEN`: that prefix would expose the token to the browser.

The project ships without a token. Your local `.env.local` supplies it. Without one, Sandbox mode shows a setup message and Sample flights remains available. Never use a live token for this demo.

## Follow one request through the code

1. `FlightResults.tsx` reads the search and selected source from the URL.
2. `sandbox-provider.ts` sends the search as JSON to our own `/api/flights/search` endpoint. It sends no Duffel credential.
3. `src/app/api/flights/search/route.ts` validates the request again. Browser validation improves UX; server validation controls what we forward.
4. `duffel.server.ts` adds the server-held test token and calls Duffel's offer request endpoint.
5. The normalizer translates slices, flight segments, total prices, currencies, operating carriers and airport-local times into Aero's display model. Only display fields reach the browser.
6. The results screen renders that model through the existing filter function and FlightCard component.

No database is needed for this search. Duffel holds the provider-side data; Aero requests it and temporarily holds the response in React state.

## Why checkout is a separate step

The sample seat map and naira baggage fees do not describe a Duffel offer. Sandbox results use separate models and a complete test journey. Selecting seats and bags makes no reservation. A server price check resolves current services and signs a short-lived quote. Confirmation retrieves fresh services again before creating a test order. Profiles are fixed fictional data; airlines requiring identity documents are not supported. Refreshing clears local choices.

Duffel stores confirmed test orders. Aero checks saved orders by offer ID and verifies their quote hash before returning a receipt. Uncertain submissions expose a read-only **Check booking status** action; order mutations are never automatically retried. Hosted sandbox checkout works without a writable filesystem. A real booking service would additionally require a shared transactional submission ledger.

## Learn by tracing

Find the JSON body sent by `sandbox-provider.ts`. Compare it with the JSON sent by `duffel.server.ts`. Explain why those two requests have different shapes and why only the second has an Authorization header.

Then find the AbortController in FlightResults. It cancels a superseded browser request and guards against stale responses. Reads have a 15-second provider timeout. Order submissions use a separate 60-second timeout and continue on the server if the browser disconnects; provider reconciliation recovers a saved order after a lost response.

Official references: [offer requests](https://duffel.com/docs/api/v2/offer-requests), [offer schema](https://duffel.com/docs/api/v2/offers), [test mode](https://duffel.com/docs/api/overview/test-mode).
