import Link from "next/link";
import { connection } from "next/server";
import { RouteGlobe, DestinationArt } from "@/components/TravelArt";
import Icon from "@/components/Icon";
import SearchForm from "@/features/flight-search/SearchForm";
import { defaultSearch, searchToParams } from "@/features/flight-search/model";

export default async function Home() {
  // Dates must be chosen at request time, not frozen into a production build.
  await connection();
  const initial = defaultSearch();
  const destinations = [
    {
      city: "London" as const,
      code: "LHR",
      country: "United Kingdom",
      tag: "A classic, reimagined",
    },
    {
      city: "Dubai" as const,
      code: "DXB",
      country: "United Arab Emirates",
      tag: "Chase the sunshine",
    },
    {
      city: "New York" as const,
      code: "JFK",
      country: "United States",
      tag: "Find your own rhythm",
    },
    {
      city: "Cape Town" as const,
      code: "CPT",
      country: "South Africa",
      tag: "Take the scenic route",
    },
  ];
  return (
    <main id="main-content">
      <section className="container hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="tiny-line" />A LITTLE FURTHER. A LITTLE FREER.
          </p>
          <h1>
            Good things
            <br />
            are <em>out there.</em>
          </h1>
          <p className="hero-description">
            A new city. A different pace. A story worth telling.
            <br className="desktop-break" /> Let’s find the flight that takes
            you there.
          </p>
          <div className="hero-note">
            <span className="note-symbol">✳</span>
            <span>For the places you’ve been dreaming of.</span>
          </div>
        </div>
        <RouteGlobe />
      </section>
      <section
        id="flight-search"
        className="container search-section"
        aria-label="Search flights"
      >
        <SearchForm initial={initial} />
        <p className="search-note">
          <Icon name="info" size={14} />
          Explore with sample flights and fares. Every booking is a demo.
        </p>
      </section>
      <section className="container destinations-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SOMEWHERE NEW</p>
            <h2>Where will your curiosity take you?</h2>
          </div>
          <span className="section-aside">
            A few places to begin <Icon name="arrow" size={18} />
          </span>
        </div>
        <div className="destination-grid">
          {destinations.map((destination) => (
            <Link
              key={destination.code}
              className="destination-card"
              href={`/flights?${searchToParams({ ...initial, destination: destination.code })}`}
            >
              <div className="destination-image">
                <DestinationArt city={destination.city} />
                <span className="destination-tag">{destination.tag}</span>
              </div>
              <div className="destination-copy">
                <div>
                  <span>{destination.country}</span>
                  <h3>{destination.city}</h3>
                </div>
                <span className="destination-arrow">
                  <Icon name="arrow" size={20} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section id="how-it-works" className="container experience-section">
        <div className="experience-intro">
          <p className="eyebrow">THE AERO EXPERIENCE</p>
          <h2>
            Every detail.
            <br />
            <em>A little easier.</em>
          </h2>
          <p>
            A considered journey, from the first search to your favorite seat.
          </p>
        </div>
        <div className="experience-steps">
          {[
            {
              number: "01",
              icon: "search" as const,
              title: "Find your kind of flight",
              copy: "Compare sample fares and filter by what matters to you.",
            },
            {
              number: "02",
              icon: "seat" as const,
              title: "Make yourself comfortable",
              copy: "Choose a seat for every traveler and watch your total update.",
            },
            {
              number: "03",
              icon: "plane" as const,
              title: "Picture the possibilities",
              copy: "Create your demo itinerary and save a boarding pass to remember it.",
            },
          ].map((step) => (
            <article key={step.number}>
              <div className="step-top">
                <span>{step.number}</span>
                <Icon name={step.icon} size={22} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="container final-callout">
        <span className="note-symbol">✳</span>
        <p>
          The world is still full of <em>first times.</em>
        </p>
        <a className="text-link" href="#main-content">
          Find yours <Icon name="arrow" size={18} />
        </a>
      </section>
    </main>
  );
}
