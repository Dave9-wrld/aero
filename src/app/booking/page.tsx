import { Suspense } from "react";
import { PageLoading } from "@/components/Shell";
import BookingFlow from "@/features/booking/BookingFlow";

export const metadata = { title: "Make it your journey" };
export default function BookingPage() {
  return (
    <main id="main-content">
      <Suspense fallback={<PageLoading />}>
        <BookingFlow />
      </Suspense>
    </main>
  );
}
