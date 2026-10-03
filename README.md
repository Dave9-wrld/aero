# Aero — a little further

A flight booking portfolio project built with **Next.js, React and TypeScript**. Search flights, compare fares, choose seats, add bags, review a current price and see your confirmation.

**[Live demo](https://aero-zeta-ruddy.vercel.app/) · [Source code](https://github.com/Dave9-wrld/aero)**

This guide walks you through using the app and understanding the code. Start with the tour, then follow one interaction through the architecture.

## 1. Run the app

Clone the repository and open a terminal inside it:

```powershell
git clone https://github.com/Dave9-wrld/aero.git
cd aero
npm install
npm run dev
```

Open [localhost:3001](http://localhost:3001). Node 20.9 or newer is required. Node 24 also supports the existing domain test script.

| Command             | Purpose                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`       | Development server; saving files updates the app                                |
| `npm run build`     | Production compilation and TypeScript checking                                  |
| `npm start`         | Production server after a build                                                 |
| `npm run typecheck` | TypeScript checking without a build                                             |
| `npm test`          | Existing sample-domain tests; these do not cover the entire sandbox integration |

Stop the dev server before building in the same folder, because Next development and production output share `.next`.

## 2. Understand the two modes

|                      | Sample flights                                | Duffel sandbox                            |
| -------------------- | --------------------------------------------- | ----------------------------------------- |
| API token            | None                                          | Duffel **test** token                     |
| Data                 | Deterministic fictional flights               | Provider test offers, seats and bags      |
| Travelers            | Enter sample names or use Fill sample details | Fixed fictional profiles supplied by Aero |
| Confirmation         | Generated locally                             | Test order created in Duffel              |
| Flight fare          | NGN, per adult                                | Provider currency, all travelers          |
| Real booking/payment | No                                            | No                                        |

The sample flow works without an API. Sandbox errors stay visible; the app does not quietly replace provider results with sample flights.

## 3. Take a five-minute tour

### Sample flights

1. Search **Lagos → London**, a future date, and one adult.
2. Try nonstop, airline and budget filters, then lowest fare and fastest sorting.
3. Choose a flight and seat. Use arrow keys in the seat map and Enter/Space to select.
4. Continue to traveler details. Use **Fill sample details** and optionally add checked bags.
5. Review the breakdown and confirm the demo trip.
6. Open **My trip** to return to the confirmation. Print/save the demo boarding pass.

Refresh a sample booking screen to see the draft restored in the same tab. Unlisted sample routes demonstrate an empty state.

### Duffel sandbox

1. Use the same search and select **Duffel sandbox** on the results screen.
2. Choose a **Duffel Airways** offer for the simplest test journey.
3. Click **View flight & seats** to retrieve the current fare and aircraft layout.
4. Pick optional seats for each traveler and each flight. Connecting itineraries need a choice per flight. You can also continue without seats.
5. Choose **Continue to bags**. Review included baggage and add optional extra bags where available.
6. Review the fictional traveler profiles. No typing or personal details needed.
7. Choose **Check latest price**. The server retrieves fresh fares and service prices.
8. Review the checked total, tick the test-mode acknowledgment and choose **Create test booking**.
9. Copy the test reference or print/save the itinerary. This confirmation is **not valid for travel**.

**My trip** opens your most recent sample or sandbox confirmation. Sandbox confirmations are saved in the same browser tab. Refreshing the offer resets seat/bag choices because availability and service IDs can change.

## 4. Set up the API

Your local token is already configured. For a fresh installation:

1. Create a [Duffel account](https://app.duffel.com) and a Developer test token with flight search and order creation permissions.
2. Copy `.env.example` to `.env.local` inside `aero`.
3. Set the token in that file:

```dotenv
DUFFEL_ACCESS_TOKEN=your_duffel_test_token_here
```

4. Restart the development server.

Keep this variable server-only. Never add `NEXT_PUBLIC_` to its name or commit `.env.local`. Aero rejects live tokens and live offers. Read [sandbox setup](docs/sandbox-setup.md) and Duffel's [test-mode guide](https://duffel.com/docs/api/overview/test-mode).

## 5. Find your way around the code

```text
src/
  app/                          Pages, layout, styles and API routes
    api/flights/search/         Flight search endpoint
    api/flights/offers/[id]/     Current fare, seats and baggage
    api/flights/checkout/quote/  Fresh server price check
    api/flights/checkout/order/  Test order creation
  components/                   Shared header, footer, icons and illustrations
  data/airports.ts               Supported airports
  features/
    flight-search/              Search form, airport picker and URL helpers
    flight-results/             Cards, filters and data providers
      duffel.server.ts          Provider requests and response normalization
    seat-selection/             Sample aircraft map
    booking/                    Sample reducer, draft storage and confirmation
    sandbox-offer/              Provider itinerary, seat maps and booking steps
    sandbox-checkout/           Bags, fictional profiles, quotes and receipts
  lib/                          Currency, dates and API request guard
```

A **page** chooses the screen. A **component** renders UI and handles interactions. A **model** describes data and rules. A **provider** obtains data without making the UI understand Duffel's JSON. An **API route** validates browser requests and talks to Duffel with the secret token.

## 6. Learn by following the data

### Lesson A — The URL can hold application state

Start at `flight-search/SearchForm.tsx`. Submitting validates the draft, calls `searchToParams`, and navigates to `/flights?...`.

`FlightResults.tsx` reads those parameters. Search, source, filters and sorting survive refresh and Back navigation. Temporary UI, such as the airport dropdown, stays in component state.

**Try:** change sorting and watch the URL. Find `update()` in FlightResults.

### Lesson B — Put external data behind a contract

Read `flight-results/types.ts`, then `sandbox-provider.ts`. Sample and sandbox providers both return `FlightOffer[]`.

```text
React screen → Aero API route → Duffel → normalize response → React screen
```

Only the server adds the token. The normalizer translates slices, segments and string prices into Aero's smaller models. AbortController prevents an outdated search response from replacing a newer one.

**Try:** find where `total_amount` becomes `priceCents`. Explain why the UI never imports `duffel.server.ts`.

### Lesson C — Derive totals from choices

Read `booking/model.ts` for samples and `sandbox-checkout/checkout.server.ts` for sandbox checkout.

Money uses integer minor units: `2000` means €20. The total comes from fare + seats + bag quantities. Keeping a separate editable total would create another value to synchronize.

**Try:** trace a seat click from SandboxSeatMap into its assignment and total. Why do you need passenger and segment IDs as well as a seat number?

### Lesson D — An estimate is different from an approved price

The browser sends choices, not a trusted price. The quote endpoint retrieves fresh data, validates choices, calculates the total and signs a quote lasting up to two minutes.

The order endpoint verifies the signature, resolves current services again, and refuses a changed total. Only then does it create a test order using fresh service IDs and fictional profiles.

**Try:** locate the comparison between the quote total and new total. What should the user see if the price changes?

### Lesson E — A timeout does not prove a booking failed

A provider could create an order while its response is lost. Blindly retrying could create another order.

Aero checks Duffel's saved orders before submission and coalesces concurrent requests within one server instance. Duffel permits only one booked offer per offer request. After an uncertain response, **Check booking status** reads the saved order without submitting another booking.

**Try:** find `recoverOrder` and `recoverOnly` in checkout.server. Why can an expired quote still check an existing booking but cannot create one?

### Lesson F — Design the awkward states too

Look for loading, empty, error, expired and unavailable states. Seats are optional, missing extras do not block progress, changes in price are visible, and step changes move keyboard focus to the heading.

**Try:** complete airport selection and navigate seats using only the keyboard.

Read [the architecture guide](docs/architecture.md) for deeper explanations and exercises.

## 7. Troubleshooting

| What you see                        | What to do                                                            |
| ----------------------------------- | --------------------------------------------------------------------- |
| Sandbox not connected               | Check `aero/.env.local` and restart the server                        |
| Token rejected                      | Use a valid test token with search/order permissions                  |
| Search/quote timeout                | Retry that read operation                                             |
| Submitted order not confirmed       | Check the Duffel test dashboard first; do not repeat the booking      |
| Offer expired                       | Return to flights and refresh offers                                  |
| Seat/bag unavailable                | Edit the choices or continue without extras                           |
| Price check expired                 | Click Check latest price again                                        |
| Airline requires identity documents | Choose Duffel Airways; Aero does not collect passports                |
| No extra bags                       | The provider supplied no purchasable baggage for this offer           |
| No saved trip                       | Use the same browser tab; storage does not follow another tab/browser |
| Port 3001 in use                    | Reuse the existing server or stop your previous one                   |

## 8. Describe it in your portfolio

> I built a flight booking interface with interchangeable data providers, URL-based search and filters, accessible seat maps, multi-traveler choices, derived totals and a complete Duffel test booking flow. Server routes protect the token, revalidate prices and services, and reconcile uncertain submissions with the provider.

Be ready to demonstrate loading and empty states, keyboard interaction, optional extras, current totals and confirmation. Explain the tradeoffs in your own words.

## 9. Current boundaries and hosting

- One-way economy, 1–4 adults, supported airports and one currency per search. Currency must use two decimal places.
- Fictional profiles only in sandbox. Airlines requiring identity documents cannot be booked here.
- No real payment, live travel booking, login, email delivery, cancellation or live flight notifications.
- Sample drafts and sandbox receipts use tab-scoped session storage. Browser storage is a convenience, not order verification.
- Deploy as a Next.js project on Vercel with Node.js route handlers. Add `DUFFEL_ACCESS_TOKEN` as a server environment secret; never use a `NEXT_PUBLIC_` variable or commit `.env.local`.
- Confirmed sandbox orders are stored by Duffel. Recovery reads them by offer ID and checks their quote hash. The app does not need writable local storage for hosted checkout.
- The in-memory request guard is per instance. Provider booking uniqueness protects this sandbox across instances; a real booking service would need a shared transactional ledger and operational reconciliation.
- Checkout endpoints enforce same-origin JSON and a basic process-wide request limit. A public deployment also needs platform rate limits and provider quota monitoring.

Official references: [flight guide](https://duffel.com/docs/guides/getting-started-with-flights), [offers](https://duffel.com/docs/api/v2/offers), [seat maps](https://duffel.com/docs/api/v2/seat-maps), [orders](https://duffel.com/docs/api/v2/orders).
