import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import ListState from "@/components/ListState";
import { CardGridSkeleton } from "@/components/Loader";
import { Clock, MapPin, ArrowRight, Route as RouteIcon } from "lucide-react";
import { usePublicTrips, type TripCard } from "@/hooks/usePublicTrips";

const CURRENCY: Record<string, string> = { EUR: "€", USD: "$", TND: "TND" };
const amount = (n: number, cur: string) => `${n.toLocaleString("fr-FR")} ${CURRENCY[cur] ?? cur}`;
const days = (c: TripCard) => `${c.duration_nights + 1} jours`;

/** Accepts a real array or a comma/newline separated string coming from the database */
const toList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map(String)
    : typeof v === "string"
      ? v.split(/\n|,/).map((s) => s.trim()).filter(Boolean)
      : [];

// Slugs come from the circuit_regions table
const REGIONS = [
  { slug: "", label: "Tous les circuits" },
  { slug: "nord", label: "Circuit Nord" },
  { slug: "sud", label: "Circuit Sud" },
];

export default function Circuit() {
  const [search] = useSearchParams();
  const region = (search.get("region") ?? "").trim().toLowerCase();
  const { data: circuits, loading, error, retry } = usePublicTrips(
    region ? { type: "circuit", region } : { type: "circuit" }
  );

  return (
    <Layout>
      <PageHero
        title="Circuits touristiques"
         badge="Guide francophone"
        breadcrumb="Circuits"
      />

      <section className="bg-[#F2F9FB] py-8 lg:py-12">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          {/* Region tabs + count */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="Régions" className="flex flex-wrap gap-2">
              {REGIONS.map((r) => {
                const active = r.slug === region;
                return (
                  <Link
                    key={r.slug || "all"}
                    to={r.slug ? `/circuit?region=${r.slug}` : "/circuit"}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-[#064B5C] bg-[#064B5C] text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-[#0A7C95] hover:text-[#0A7C95]"
                    }`}
                  >
                    {r.label}
                  </Link>
                );
              })}
            </nav>
            {!loading && !error && circuits.length > 0 && (
              <p className="text-sm text-gray-500">
                <span className="font-bold text-[#064B5C]">{circuits.length}</span> circuit
                {circuits.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {loading ? (
            <CardGridSkeleton count={6} />
          ) : error || circuits.length === 0 ? (
            <ListState
              error={!!error}
              onRetry={retry}
              icon={RouteIcon}
              title="Nouveaux circuits bientôt en ligne"
              text="Aucun circuit n'est publié pour le moment. Dites-nous ce que vous cherchez, nous vous préparons un itinéraire."
              contactSubject="circuits"
            />
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {circuits.map((c) => {
                const stops = toList(c.attributes?.stops);
                const highlights = toList(c.attributes?.highlights);
                return (
                  <li key={c.id}>
                    <Link
                      to={`/circuit/${c.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#064B5C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt={c.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#064B5C] to-[#0A7C95]">
                            <RouteIcon className="h-10 w-10 text-white/40" strokeWidth={1.5} aria-hidden="true" />
                          </div>
                        )}
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#064B5C] shadow-sm">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {days(c)}
                        </span>
                        {c.badge && (
                          <span className="absolute right-3 top-3 rounded-full bg-[#E3A312] px-2.5 py-1 text-xs font-bold text-[#06303A]">
                            {c.badge}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-[#06303A] transition-colors group-hover:text-[#0A7C95]">
                          {c.title}
                        </h3>

                        {stops.length > 0 ? (
                          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-gray-500">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A7C95]" aria-hidden="true" />
                            <span className="line-clamp-1">{stops.join(" → ")}</span>
                          </p>
                        ) : (
                          c.destination && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
                              <MapPin className="h-3.5 w-3.5 text-[#0A7C95]" aria-hidden="true" /> {c.destination}
                            </p>
                          )
                        )}

                        {c.summary && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{c.summary}</p>}

                        {highlights.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {highlights.slice(0, 3).map((h, i) => (
                              <span
                                key={`${h}-${i}`}
                                className="rounded-full bg-[#E8F5F8] px-2.5 py-0.5 text-xs font-medium text-[#064B5C]"
                              >
                                {h}
                              </span>
                            ))}
                            {highlights.length > 3 && (
                              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                                +{highlights.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-auto flex items-end justify-between gap-3 border-t border-gray-100 pt-3 mt-4">
                          <div>
                            {c.new_price != null ? (
                              <>
                                {c.old_price && c.old_price > c.new_price && (
                                  <p className="text-xs text-gray-400 line-through">{amount(c.old_price, c.currency)}</p>
                                )}
                                <p className="text-[11px] text-gray-500">À partir de</p>
                                <p className="flex items-baseline gap-1">
                                  <span className="text-xl font-extrabold text-[#0A7C95]">
                                    {amount(c.new_price, c.currency)}
                                  </span>
                                  <span className="text-xs text-gray-500">/ pers.</span>
                                </p>
                              </>
                            ) : (
                              <p className="text-base font-bold text-[#0A7C95]">Prix sur devis</p>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#064B5C] px-3.5 py-2 text-sm font-semibold text-white transition group-hover:bg-[#0A7C95]">
                            Détails
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </Layout>
  );
}