import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";
import ListState from "@/components/ListState";
import { CardGridSkeleton } from "@/components/Loader";
import { Clock, Users, Sparkles, ArrowRight, Route as RouteIcon } from "lucide-react";
import { usePublicTrips, type TripCard } from "@/hooks/usePublicTrips";

const CURRENCY: Record<string, string> = { EUR: "€", USD: "$", TND: "TND" };
const amount = (n: number, cur: string) =>
  cur === "TND" ? `${n.toLocaleString("fr-FR")} TND` : `${n.toLocaleString("fr-FR")} ${CURRENCY[cur] ?? cur}`;
const days = (c: TripCard) => `${c.duration_nights + 1} jours`;

/** Contact page with the circuit already named in the message */
const requestLink = (c: TripCard) =>
  `/contact?subject=circuits&message=${encodeURIComponent(
    `Bonjour, je suis intéressé(e) par le circuit « ${c.title} » (${days(c)}${
      c.new_price != null ? `, à partir de ${amount(c.new_price, c.currency)} / pers.` : ""
    }).\nDates souhaitées : \nNombre de personnes : `
  )}#contact-form`;

export default function CircuitPage() {
  // /circuit?region=nord  ou  ?region=sud : le slug vient de la table circuit_regions
  const [search] = useSearchParams();
  const region = (search.get("region") ?? "").trim().toLowerCase();
  const { data: circuits, loading, error, retry } = usePublicTrips(
    region ? { type: "circuit", region } : { type: "circuit" }
  );

  return (
    <Layout>
      <PageHero
        title="Circuits touristiques"
        subtitle="Des itinéraires pensés pour découvrir l'essentiel de chaque destination"
        badge="Aventures guidées"
        breadcrumb="Circuits"
      />

      <section className="bg-[#F2F9FB] py-12 lg:py-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Guide francophone"
            title="Nos"
            highlight="itinéraires"
            subtitle="Petits groupes, étapes choisies, hébergements vérifiés : laissez-vous guider."
          />

          {region && !loading && (
            <p className="mt-6 text-sm">
              <Link to="/circuit" className="font-semibold text-[#0A7C95] hover:underline">← Tous les circuits</Link>
            </p>
          )}

          <div className="mt-10">
            {loading ? (
              <CardGridSkeleton count={4} />
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
              <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {circuits.map((c) => {
                  const stops = c.attributes?.stops ?? [];
                  const highlights = c.attributes?.highlights ?? [];
                  return (
                    <li key={c.id}>
                      <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#064B5C]/10 sm:flex-row">
                        <div className="skeleton relative aspect-[16/10] shrink-0 overflow-hidden sm:aspect-auto sm:w-2/5">
                          {c.image_url ? (
                            <img
                              src={c.image_url}
                              alt={c.title}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full min-h-40 w-full items-center justify-center bg-gradient-to-br from-[#064B5C] to-[#0A7C95]">
                              <RouteIcon className="h-12 w-12 text-white/35" strokeWidth={1.5} aria-hidden="true" />
                            </div>
                          )}
                          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-[#064B5C] shadow-sm">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {days(c)}
                          </span>
                        </div>

                        <div className="flex flex-1 flex-col p-5 sm:p-6">
                          <h3 className="text-xl font-bold text-[#06303A] transition-colors group-hover:text-[#0A7C95]">
                            {/* lien étendu à toute la carte (le bouton reste au-dessus) */}
                            <Link to={`/circuit/${c.slug}`} className="after:absolute after:inset-0 after:content-['']">
                              {c.title}
                            </Link>
                          </h3>
                          {c.attributes?.group_size && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                              <Users className="h-3.5 w-3.5" aria-hidden="true" /> {c.attributes.group_size}
                            </p>
                          )}

                          {/* Route: stops linked by a dashed line */}
                          {stops.length > 0 && (
                            <ol className="mt-4 flex flex-wrap items-center gap-y-2 text-xs font-semibold text-[#064B5C]" aria-label="Étapes">
                              {stops.map((stop, i) => (
                                <li key={`${stop}-${i}`} className="flex items-center">
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className={`h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ${
                                        i === 0 || i === stops.length - 1
                                          ? "bg-[#E3A312] ring-[#E3A312]/40"
                                          : "bg-[#0A7C95] ring-[#0A7C95]/30"
                                      }`}
                                      aria-hidden="true"
                                    />
                                    {stop}
                                  </span>
                                  {i < stops.length - 1 && (
                                    <span className="mx-2 w-5 border-t-2 border-dashed border-gray-300" aria-hidden="true" />
                                  )}
                                </li>
                              ))}
                            </ol>
                          )}

                          {highlights.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {highlights.map((h, i) => (
                                <span
                                  key={`${h}-${i}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#FFF6DD] px-2.5 py-1 text-xs font-medium text-[#7A5200]"
                                >
                                  <Sparkles className="h-3 w-3" aria-hidden="true" /> {h}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-auto pt-5">
                            <div className="flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
                              <div>
                                {c.new_price != null ? (
                                  <>
                                    {c.old_price && c.old_price > c.new_price && (
                                      <p className="text-xs text-gray-400 line-through">{amount(c.old_price, c.currency)}</p>
                                    )}
                                    <p className="text-[11px] text-gray-500">À partir de</p>
                                    <p className="flex items-baseline gap-1">
                                      <span className="text-2xl font-extrabold text-[#0A7C95]">{amount(c.new_price, c.currency)}</span>
                                      <span className="text-xs text-gray-500">/ pers.</span>
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-lg font-extrabold text-[#0A7C95]">Prix sur devis</p>
                                )}
                              </div>
                              <Link
                                to={requestLink(c)}
                                className="relative z-10 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-5 py-2.5 text-sm font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2"
                              >
                                Demander ce circuit
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
