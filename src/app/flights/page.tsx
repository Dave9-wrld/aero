import { Suspense } from "react";
import { PageLoading } from "@/components/Shell";
import FlightResults from "@/features/flight-results/FlightResults";

export const metadata = { title: "Find your flight" };
export default function FlightsPage() {
  return (
    <main id="main-content">
      <Suspense fallback={<PageLoading />}>
        <FlightResults />
      </Suspense>
    </main>
  );
}
