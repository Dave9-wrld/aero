import { Suspense } from "react";
import { PageLoading } from "@/components/Shell";
import SandboxOffer from "@/features/sandbox-offer/SandboxOffer";

export const metadata = { title: "Your flight and seat" };
export default function SandboxOfferPage() {
  return (
    <main id="main-content">
      <Suspense fallback={<PageLoading />}>
        <SandboxOffer />
      </Suspense>
    </main>
  );
}
