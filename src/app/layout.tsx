import type { Metadata } from "next";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { Header, Footer } from "@/components/Shell";
import BookingProvider from "@/features/booking/BookingProvider";

export const metadata: Metadata = {
  title: { default: "Aero — A little further", template: "%s · Aero" },
  description:
    "A thoughtfully crafted flight booking portfolio demo. Discover flights, choose your seat, and create a sample itinerary.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <BookingProvider>
          <Header />
          {children}
        </BookingProvider>
        <Footer />
      </body>
    </html>
  );
}
