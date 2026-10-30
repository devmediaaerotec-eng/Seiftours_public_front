import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import HotelCard from "@/components/HotelCard";
import type { Hotel } from "@/components/HotelCard";
import SectionHeading from "@/components/SectionHeading";
import { Globe2 } from "lucide-react";

const hotels: Hotel[] = [
  {
    name: "Burj Al Arab Jumeirah",
    location: "Dubaï, EAU",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhrfslaaafnq/destination-dubai-marina.png",
    rating: 4.9,
    reviews: 1284,
    price: 580,
    stars: 5,
    features: ["Luxe", "Plage privée", "Spa"],
    badge: "Luxe",
  },
  {
    name: "Hôtel Le Meurice",
    location: "Paris, France",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhreuyaaafla/destination-paris-eiffel.png",
    rating: 4.8,
    reviews: 892,
    price: 450,
    stars: 5,
    features: ["Centre-ville", "Palace", "Michelin"],
  },
  {
    name: "Four Seasons Bosphorus",
    location: "Istanbul, Turquie",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhrev6aaafna/destination-istanbul-hagia.png",
    rating: 4.9,
    reviews: 756,
    price: 320,
    oldPrice: 420,
    stars: 5,
    features: ["Vue Bosphore", "Spa", "Piscine"],
    badge: "-24%",
  },
  {
    name: "Katikies Hotel Santorini",
    location: "Santorin, Grèce",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhrfuryaaflq/deal-santorini.png",
    rating: 4.9,
    reviews: 623,
    price: 520,
    stars: 5,
    features: ["Vue mer", "Piscine infini", "Adults only"],
  },
  {
    name: "Conrad Maldives Rangali",
    location: "Maldives",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhrft6qaafmq/deal-maldives.png",
    rating: 5.0,
    reviews: 445,
    price: 890,
    stars: 5,
    features: ["Overwater villa", "Plongée", "Tout inclus"],
    badge: "Top",
  },
  {
    name: "La Mamounia Marrakech",
    location: "Marrakech, Maroc",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhrfriaaafla/deal-marrakech.png",
    rating: 4.8,
    reviews: 912,
    price: 380,
    stars: 5,
    features: ["Jardins", "Spa", "Palace"],
  },
];

// "Paris, France" -> "France"; "Maldives" -> "Maldives"
const country = (h: Hotel) => h.location.split(",").pop()!.trim();

/** These hotels are booked on request: the card opens the contact form with the hotel named */
const withRequest = (h: Hotel): Hotel => ({
  ...h,
  to: `/contact?subject=hotels&message=${encodeURIComponent(
    `Bonjour, je souhaite un devis pour l’hôtel ${h.name} (${h.location}).\nDates : \nNombre de personnes : `
  )}#contact-form`,
});

export default function HotelsEtranger() {
  const [active, setActive] = useState("Tous");
  // Only countries that actually have hotels
  const countries = useMemo(() => ["Tous", ...Array.from(new Set(hotels.map(country)))], []);
  const shown = active === "Tous" ? hotels : hotels.filter((h) => country(h) === active);

  return (
    <Layout>
      <PageHero
        title="Hôtels à l’étranger"
        subtitle="Les plus beaux hôtels du monde sélectionnés pour votre confort"
        badge="Destinations internationales"
        breadcrumb="Hôtels à l’étranger"
        image="https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhrfslaaafnq/destination-dubai-marina.png"
      />

      <section className="bg-[#F2F9FB] py-12 lg:py-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Sélection premium"
            title="Hôtels"
            highlight="dans le monde"
            subtitle="Réservation sur demande : un conseiller confirme la disponibilité et le meilleur tarif."
          />

          {/* Country filter: one swipeable row on phones */}
          <div
            role="group"
            aria-label="Filtrer par pays"
            className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
          >
            {countries.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={active === c}
                onClick={() => setActive(c)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active === c
                    ? "bg-[#064B5C] text-white shadow"
                    : "border border-gray-300 bg-white text-gray-700 hover:border-[#0A7C95] hover:text-[#0A7C95]"
                }`}
              >
                {c === "Tous" && <Globe2 className="h-4 w-4" aria-hidden="true" />}
                {c}
                <span className={`text-xs ${active === c ? "text-white/70" : "text-gray-400"}`}>
                  {c === "Tous" ? hotels.length : hotels.filter((h) => country(h) === c).length}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm text-gray-600" aria-live="polite">
            <span className="font-bold text-[#06303A]">{shown.length}</span> hôtel{shown.length > 1 ? "s" : ""}
            {active !== "Tous" && ` en ${active}`}
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((h) => (
              <li key={h.name}>
                <HotelCard hotel={withRequest(h)} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Layout>
  );
}
