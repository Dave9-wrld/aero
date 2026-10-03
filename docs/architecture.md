# Learn Aero by following the data

## 1. Begin with the data model

`src/features/flight-search/types.ts` defines `SearchCriteria`. This is the contract shared by the form, results screen and flight provider. `model.ts` validates airport codes, dates and passenger counts and converts the model to and from URL parameters.

The form has draft state while the user types. Submitting validates the draft and navigates to `/flights?from=LOS&to=LHR&date=...&passengers=1`. The results screen reads that URL. A browser refresh or Back navigation therefore restores the submitted search without a global search context.

Exercise: trace what happens when a user swaps airports. Find the single state update that changes both fields. Explain why two separate updates based on an old object could lose one of the changes.

## 2. Use a boundary for external data

`src/features/flight-results/types.ts` defines `FlightProvider`. The results screen calls `flightProvider.search(criteria, { signal })`. It does not generate flights or know an external provider's JSON format.

`provider.ts` currently implements the contract with deterministic sample flights. The delay makes the loading state visible. An AbortController cancels work when a new search replaces it, preventing a slower previous result from overwriting the current search.

`sandbox-provider.ts` implements the same contract using a request to Aero's own API route. That route validates input and calls `duffel.server.ts`, which reads the test token on the server and normalizes external responses. The `server-only` import prevents this module being accidentally imported into browser components.

The selected source lives in a `source=duffel` URL parameter. Switching sources clears airline and budget filters because those filters describe the previous provider's values. The chosen source survives a refreshed page or a modified search. API errors remain errors; the app does not substitute sample offers.

Sandbox prices cover all travelers and use the provider's currency. Sample prices are per adult in NGN. `priceBasis` makes that difference explicit, and the card and budget controls label it. Sandbox cards open a separate provider booking journey; the sample reducer rejects these offers because its seat map and baggage prices do not belong to the provider. Read [sandbox-setup.md](sandbox-setup.md) for the setup and complete request trace.

Exercise: trace one sandbox request from the browser to Duffel and back. Which values does the server add, and which provider fields does it discard before responding?

## 3. Separate filter state from source data

`filter.ts` is a pure function: given offers and filters, it returns a new sorted list. It never changes the provider's array. Airline, nonstop, budget and sort choices live in the URL alongside the search, so they survive refresh.

The results component makes a new provider request only when the search criteria change. Changing a display filter uses the already-loaded offers.

Exercise: add a departure-time filter to this function and a domain test before adding its UI.

## 4. Put booking transitions in a reducer

`src/features/booking/model.ts` contains the booking model and reducer. Starting a booking creates a seat and traveler slot for every adult. Actions represent user intentions: start, assign a seat, edit a traveler, change bags, and confirm.

The reducer rejects occupied seats and prevents two travelers from taking the same seat. Confirmation requires valid traveler details and one available seat per adult. Keeping these rules in the model makes them testable independently from the components.

`BookingProvider.tsx` shares the reducer between booking screens and the My trip link. The root layout passes the static shell and routes into this Client Component. Interactive parts use client components; pages still compose the screens as server components.

Exercise: explain which state belongs in this provider and why the open airport dropdown remains local to AirportPicker.

## 5. Calculate totals instead of storing them

Prices are integer minor units: 100 cents equals one naira. `bookingTotal` combines fare × adults, seat premiums and additional checked bags. Both the review summary and boarding pass use the same function.

The total is derived data. Storing a separate total in state would create an extra value to synchronize whenever a traveler changes seats or baggage.

Exercise: add a discount calculation with clear rounding rules, then verify that the summary and confirmation still agree.

## 6. Restore carefully

Session storage restores a draft when the same tab refreshes. The provider reads storage after mounting and only starts saving once hydration is complete, avoiding overwriting the saved draft with an initial empty state.

Stored JSON is validated. The flight and fare are rebuilt from the sample provider rather than trusted from storage, and invalid or duplicate seats are discarded. Expired search dates clear old drafts. This is data consistency for a demo, not a security boundary; real inventory and pricing must be enforced on a server.

## 7. Design interaction deliberately

The airport picker supports typing, arrow navigation, Enter and Escape. The seat map uses a single Tab stop and arrow-key navigation; occupied seats can receive focus to announce their status but cannot be selected. Seat availability is described in accessible labels as well as colors.

Next.js URL hooks are placed below Suspense boundaries, as required by the installed framework guidance for prerendered routes. Browser APIs such as storage and printing stay inside client components and effects or event handlers.

The home page calls Next.js `connection()` before calculating its suggested departure date. This renders those defaults when a request arrives, preventing a production build from permanently freezing its dates. The dates use the Africa/Lagos timezone consistently.

Exercise: walk through the complete app using only a keyboard. Explain the difference between keyboard focus, the active traveler and a selected seat.

## 8. Retrieve an offer before working with its seats

`sandbox-offer/provider.ts` defines an `OfferDetailsProvider` contract. The browser calls `/api/flights/offers/[id]` with an offer ID and search criteria. The route validates both; the server retrieves the current Duffel offer, checks test mode, expiry, route and adult count, and then retrieves its seat maps. A seat-map failure does not discard a valid current offer. It returns a separate error so the user can review the itinerary and retry the map.

`types.ts` keeps flight segments, seat maps and seat services as separate models. A flight can contain multiple segments, and a seat service is priced for a specific passenger. The renderer preserves cabins, rows, sections and non-seat elements rather than assuming every aircraft has six seats per row. An empty service list means a seat cannot be selected for that traveler; it does not prove that somebody occupies the seat.

Assignments are identified by segment and passenger. Another traveler cannot take the same seat on the same segment. Different segments may reuse the same seat number. The estimated total derives from the current group fare plus selected service fees, all in the same currency. Choosing a seat does not reserve it. Choices stay local and reset on offer refresh; seats are optional for sandbox checkout.

The search URL carries its displayed quote only to detect a fare change. That browser value never calculates the current total. A timer disables choices when an offer expires. Checkout retrieves fresh data again before creating a test order.

Exercise: trace the selected seat's `passengerId` and `serviceId` from the provider response into an assignment. Explain why a seat number alone cannot describe a seat purchase on a connecting flight.

## 9. Approve a current price before a test order

`sandbox-checkout/model.ts` separates choices, quotes and receipts. Browser choices describe seats by passenger, segment and designator. Bags use a stable key describing their travelers, segments and attributes. The server resolves these choices against fresh provider data to obtain the newest service IDs, rejects ambiguous/unavailable choices, and checks duplicate selections and maximum quantities. Included baggage comes from each segment's passenger allowances; unknown allowances remain unknown.

The quote endpoint signs the choices, calculated total, currency and expiry with an HMAC using a server-only secret. It lasts at most two minutes or until offer expiry. The order endpoint verifies the quote and retrieves current services again. A changed total requires another visible price check. The browser cannot set the payment amount.

Passenger profiles are fixed fictional data generated on the server. The endpoint does not accept personal names, passports or card details. Offers requiring identity documents are rejected. Test tokens and live-mode checks remain mandatory. Balance payments exist only inside Duffel's test environment.

Exercise: trace one seat through browser estimate, server quote and provider order. Which stage chooses each price and service ID?

## 10. Protect against repeat and uncertain submissions

`checkout.server.ts` reads Duffel's orders filtered by offer ID before submission. A process-local promise map coalesces concurrent requests in one instance. Across instances, Duffel's documented rule permits only one booked offer per offer request. This protects the sandbox from duplicate bookings; it is not a distributed HTTP submission lock.

The signed quote carries a compact receipt display snapshot without the large seat map. Its hash is attached to the provider order as metadata. Recovery checks the test mode, offer ID, quote hash, total and currency against the provider's saved record. After an uncertain response, the UI offers **Check booking status**, which performs only a provider read. An expired quote can authorize this read but never a new order. No writable local filesystem is needed on Vercel. Browser storage is never the order source of truth. A real booking product would additionally need a shared transactional submission ledger, authentication and operational reconciliation.

Reference: [Duffel orders](https://duffel.com/docs/api/v2/orders), including offer-request booking uniqueness and the `offer_id` list filter.

`trip-store.ts` uses `useSyncExternalStore` so My trip updates after confirmation. Session storage restores completed receipts in the same tab. A separate sandbox confirmation route avoids confusing provider test orders with local sample confirmations. Printing produces a marked test itinerary rather than a valid boarding pass.

Exercise: explain why disabling the confirm button helps UX but does not protect the server against duplicate requests.

## 11. Keep booking navigation visible

`BookingActionBar` is shared by sample and sandbox checkout. It keeps Back, the next action, the step number and the current total visible at the bottom of the viewport. The page reserves space for the bar, with responsive layouts and safe-area padding. It remains inside the traveler form so its submit action retains form semantics.

The sandbox itinerary expands in place instead of repeating a full flight breakdown above every step. On small screens, the booking content comes before the secondary summary. Step changes move focus to the heading; invalid sample traveler details focus the first affected field. A missing sandbox acknowledgment can be reached directly from the action bar, and no order is submitted until it is checked.

The header derives the next unfinished sample step from validated booking state. With no trip it links directly to search; with an unfinished draft it offers Continue booking. During uncertain sandbox order recovery, refresh and step changes are disabled so the read-only recovery action is retained.
