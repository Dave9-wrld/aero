import Link from "next/link";
import Icon from "./Icon";
import TripLink from "@/features/booking/TripLink";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Aero home">
          <span className="brand-icon">
            <Icon name="plane" size={20} />
          </span>
          aero<span className="brand-period">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Book a flight</Link>
          <Link href="/#how-it-works" className="nav-secondary">
            The experience
          </Link>
        </nav>
        <div className="header-actions">
          <details className="demo-details">
            <summary>
              <span className="status-dot" />
              Portfolio demo
            </summary>
            <div className="demo-popover">
              <strong>A little imagination. A real interface.</strong>
              <p>
                Explore sample flights or book a fictional trip in Duffel’s
                sandbox. This portfolio demo never books real travel or takes a
                real payment.
              </p>
            </div>
          </details>
          <TripLink />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Link href="/" className="brand footer-brand">
          aero<span className="brand-period">.</span>
        </Link>
        <p>A thoughtfully built flight booking experience.</p>
        <span>Sample fares. Real attention to detail.</span>
      </div>
    </footer>
  );
}

export function PageLoading() {
  return (
    <div className="container page-loading" role="status">
      <span className="loader" />
      <p>Getting things ready…</p>
    </div>
  );
}
