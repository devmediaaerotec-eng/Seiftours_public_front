import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";
import ListState from "@/components/ListState";
import { CardGridSkeleton } from "@/components/Loader";
import { CalendarDays, CircleCheck, MapPin, Clock, Globe, ArrowRight } from "lucide-react";
import { usePublicTrips, type TripCard } from "@/hooks/usePublicTrips";
import ReservationModal from "../component/ReservationModal";

const price = (n: number) => n.toLocaleString("fr-FR");
const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
type Trip = TripCard;

export default function VoyageOrganise() {
   const { destination: pathSlug } = useParams();
  const [search] = useSearchParams();
  const destination = (pathSlug ?? search.get("destination") ?? "").trim().toLowerCase();
  const { data: trips, loading, error, retry } = usePublicTrips(
    destination ? { type: "organized", destination } : { type: "organized" }
  );
  const placeName = trips[0]?.destination ?? destination.charAt(0).toUpperCase() + destination.slice(1);
  const [selected, setSelected] = useState<Trip | null>(null);

  return (
    <Layout>
      <PageHero
        title={  placeName }
         badge="Tout inclus"
        breadcrumb="Voyages organisés"
      />

      <section className="bg-[#F2F9FB] py-12 lg:py-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Vol + hôtel + transferts"
            title="Nos forfaits"
            highlight="les plus populaires"
            subtitle="Vol, hôtel, transferts et activités : tout est inclus dans nos voyages organisés."
          />

          {destination && !loading && (
            <p className="mt-6 text-sm">
              <Link to="/voyage-organise" className="font-semibold text-[#0A7C95] hover:underline">← Toutes les destinations</Link>
            </p>
          )}

          <div className="mt-10">
            {loading ? (
              <CardGridSkeleton count={6} />
            ) : error || trips.length === 0 ? (
              <ListState
                error={!!error}
                onRetry={retry}
                icon={Globe}
                title={destination ? `Bientôt des départs pour ${placeName}` : "Nouveaux départs bientôt en ligne"}
                text={destination ? "Aucun voyage n'est publié pour cette destination pour le moment. Dites-nous vos dates, nous vous préparons une offre." : "Aucun voyage n'est publié pour le moment. Dites-nous où vous rêvez d'aller, nous vous préparons une offre."}
                contactSubject="trips"
              />
            ) : (
              <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {trips.map((pkg) => (
                  <li key={pkg.id}>
                    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#064B5C]/10">
                      <div className="skeleton relative aspect-[16/10] overflow-hidden">
                        {pkg.image_url ? (
                          <img
                            src={pkg.image_url}
                            alt={pkg.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#064B5C] to-[#0A7C95]">
                            <Globe className="h-14 w-14 text-white/35" strokeWidth={1.5} aria-hidden="true" />
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#031E26]/80 to-transparent" />
                        {pkg.badge && (
                          <span className="absolute left-3 top-3 rounded-full bg-[#F2B705] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#06303A] shadow">
                            {pkg.badge}
                          </span>
                        )}
                        <div className="absolute inset-x-4 bottom-3 flex items-center justify-between gap-2 text-xs font-medium text-white">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden="true" />
                            {pkg.destination ?? pkg.title}
                          </span>
                          {pkg.duration && (
                            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 backdrop-blur-sm">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {pkg.duration}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <h3 className="text-lg font-bold leading-snug text-[#06303A] transition-colors group-hover:text-[#0A7C95]">
                          {/* lien étendu à toute la carte (le bouton Réserver reste au-dessus) */}
                          <Link to={`/voyage-organise/${pkg.slug}`} className="after:absolute after:inset-0 after:content-['']">
                            {pkg.title}
                          </Link>
                        </h3>

                        {pkg.inclusions.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {pkg.inclusions.slice(0, 4).map((inc, k) => (
                              <li key={k} className="flex items-start gap-2 text-sm text-gray-700">
                                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0A7C95]" aria-hidden="true" />
                                {inc}
                              </li>
                            ))}
                          </ul>
                        )}

                        {pkg.departure_dates.length > 0 && (
                          <div className="mt-4">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Prochains départs
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {pkg.departure_dates.slice(0, 4).map((d) => (
                                <span
                                  key={d}
                                  className="rounded-full bg-[#E8F5F8] px-2.5 py-0.5 text-xs font-medium text-[#064B5C]"
                                >
                                  {fmtDate(d)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-auto pt-5">
                          <div className="flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
                            <div>
                              {pkg.new_price != null && pkg.old_price && pkg.old_price > pkg.new_price ? (
                                <p className="text-xs text-gray-400 line-through">{price(pkg.old_price)} {pkg.currency}</p>
                              ) : null}
                              {pkg.new_price != null ? (
                                <>
                                  <p className="text-[11px] text-gray-500">À partir de</p>
                                  <p className="flex items-baseline gap-1">
                                    <span className="text-2xl font-extrabold text-[#0A7C95]">{price(pkg.new_price)}</span>
                                    <span className="text-xs text-gray-500">{pkg.currency} / pers.</span>
                                  </p>
                                </>
                              ) : (
                                <p className="text-lg font-extrabold text-[#0A7C95]">Prix sur devis</p>
                              )}
                            </div>
                            <button
                              onClick={() => setSelected(pkg)}
                              className="relative z-10 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-5 py-2.5 text-sm font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2"
                            >
                              Réserver
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {selected && (
        <ReservationModal
          isOpen={true}
          onClose={() => setSelected(null)}
          type="trip"
          itemId={String(selected.id)}
          itemName={selected.title}
          price={selected.new_price ?? 0}
          departureDates={selected.departure_dates}
          imageUrl={selected.image_url ?? undefined}
        />
      )}
    </Layout>
  );
}