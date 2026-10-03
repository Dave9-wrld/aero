import Link from "next/link";
import Icon from "@/components/Icon";
export default function NotFound() {
  return (
    <main id="main-content" className="container empty-state">
      <Icon name="globe" size={40} />
      <p className="eyebrow">A SMALL DETOUR</p>
      <h1>This destination isn’t on the map.</h1>
      <p>Let’s get you back to somewhere familiar.</p>
      <Link href="/" className="button button-primary">
        Back to Aero <Icon name="arrow" />
      </Link>
    </main>
  );
}
