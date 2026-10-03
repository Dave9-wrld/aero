"use client";
import Icon from "@/components/Icon";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="container empty-state">
      <Icon name="info" size={40} />
      <h1>A small interruption.</h1>
      <p>Something went wrong while preparing this page. Please try again.</p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
