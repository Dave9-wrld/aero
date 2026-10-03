import type { ReactNode } from "react";

export default function BookingActionBar({
  step,
  total,
  hint,
  children,
}: {
  step: string;
  total: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="booking-action-bar" aria-label="Booking navigation">
      <div className="container booking-action-inner">
        <div className="booking-action-context">
          <span>{step}</span>
          <strong aria-live="polite">{total}</strong>
          <p role="status">{hint}</p>
        </div>
        <div className="booking-navigation">{children}</div>
      </div>
    </section>
  );
}
