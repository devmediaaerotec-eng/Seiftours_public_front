import { useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import SectionHeading from "@/components/SectionHeading";
import ListState from "@/components/ListState";
import { CardGridSkeleton } from "@/components/Loader";
import { CircleCheck, MoonStar,  Building2, Footprints, Clock, ArrowRight } from "lucide-react";
import { usePublicTrips } from "@/hooks/usePublicTrips";

interface OmraPackage {
  id: string;
  slug: string;
  name: string;
  duration: string;
  hotel_makkah?: string;
  hotel_madinah?: string;
  distance?: string;
  price: number | null;      // null = sur devis
  inclusions: string[];
  badge?: string;
  image_url?: string;
}

 

export default function OmraPage() {
  const { data: trips, loading, error, retry } = usePublicTrips({ type: "omra" });
  // Hôtels / distance : pas encore de colonnes dans `trips` (lignes masquées tant qu'elles sont vides)
  const packages: OmraPackage[] = useMemo(
    () =>
      trips.map((t) => ({
        id: String(t.id),
        slug: t.slug,
        name: t.title,
        duration: t.duration,
        price: t.new_price,
        inclusions: t.inclusions,
        badge: t.badge ?? undefined,
        image_url: t.image_url ?? undefined,
      })),
    [trips]
  );
  // With three offers or more, the middle one is put forward
  const featuredIndex = packages.length >= 3 ? 1 : -1;

  return (
    <Layout>
    <PageHero
  title="Omra, voyage spirituel"
   badge="Accompagnement religieux"
  breadcrumb="Omra"
  image="/omra.webp"
/>

  
       <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Makkah & Madinah"
            title="Nos forfaits"
            highlight="Omra"
            subtitle="Choisissez le niveau de confort qui vous convient"
          />

          <div className="mt-10">
            {loading ? (
              <CardGridSkeleton count={3} />
            ) : error || packages.length === 0 ? (
              <ListState
                error={!!error}
                onRetry={retry}
                icon={MoonStar}
                title="Prochains départs bientôt publiés"
                text="Les forfaits de la saison arrivent. Laissez-nous vos dates et votre budget, nous vous rappelons."
                contactSubject="omra"
              />
            ) : (
              <ul className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
                {packages.map((p, idx) => {
                  const hl = idx === featuredIndex;
                  const muted = hl ? "text-white/75" : "text-gray-500";
                  return (
                    <li key={p.id}>
                      <article
                        className={`relative flex h-full flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 ${
                          hl
                            ? "bg-gradient-to-b from-[#064B5C] to-[#06303A] text-white shadow-2xl ring-2 ring-[#E3A312] lg:-my-3"
                            : "border border-gray-200/70 bg-white text-[#06303A] shadow-sm hover:shadow-xl"
                        }`}
                      >
                        {p.image_url && (
                          <div className="skeleton relative h-44 overflow-hidden">
                            <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                            <div
                              className={`absolute inset-0 ${
                                hl ? "bg-gradient-to-t from-[#064B5C] to-transparent" : "bg-gradient-to-t from-black/30 to-transparent"
                              }`}
                            />
                          </div>
                        )}
                        {(p.badge || hl) && (
                          <span className="absolute right-4 top-4 rounded-full bg-[#F2B705] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#06303A] shadow">
                            {p.badge || "Recommandé"}
                          </span>
                        )}

                        <div className="flex flex-1 flex-col p-6">
                          <span
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                              hl ? "bg-white/10 text-[#FFC94D]" : "bg-[#E8F5F8] text-[#0A7C95]"
                            }`}
                          >
                            <MoonStar className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <h3 className="mt-4 text-xl font-extrabold">{p.name}</h3>
                          {p.duration && (
                            <p className={`mt-1 flex items-center gap-1.5 text-sm ${muted}`}>
                              <Clock className="h-4 w-4" aria-hidden="true" /> {p.duration}
                            </p>
                          )}

                          <dl className="mt-4 space-y-2 text-sm">
                            {[
                              { icon: Building2, label: "Makkah", value: p.hotel_makkah },
                              { icon: Building2, label: "Madinah", value: p.hotel_madinah },
                              { icon: Footprints, label: "Distance", value: p.distance },
                            ]
                              .filter((row) => row.value)
                              .map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-start gap-2">
                                  <Icon
                                    className={`mt-0.5 h-4 w-4 shrink-0 ${hl ? "text-[#F2B705]" : "text-[#0A7C95]"}`}
                                    aria-hidden="true"
                                  />
                                  <dt className="font-semibold">{label} :</dt>
                                  <dd className={hl ? "text-white/85" : "text-gray-700"}>{value}</dd>
                                </div>
                              ))}
                          </dl>

                          {p.inclusions.length > 0 && (
                            <ul className={`mt-4 space-y-1.5 border-t pt-4 ${hl ? "border-white/15" : "border-gray-100"}`}>
                              {p.inclusions.map((inc, k) => (
                                <li key={k} className="flex items-start gap-2 text-sm">
                                  <CircleCheck
                                    className={`mt-0.5 h-4 w-4 shrink-0 ${hl ? "text-[#FFC94D]" : "text-[#0A7C95]"}`}
                                    aria-hidden="true"
                                  />
                                  <span className={hl ? "text-white" : "text-gray-700"}>{inc}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="mt-auto pt-6">
                            {p.price != null ? (
                              <>
                                <p className={`text-xs ${muted}`}>À partir de</p>
                                <p className="flex items-baseline gap-1">
                                  <span className={`text-3xl font-extrabold ${hl ? "text-[#FFC94D]" : "text-[#0A7C95]"}`}>
                                    {p.price.toLocaleString("fr-FR")}
                                  </span>
                                  <span className={`text-sm ${muted}`}>TND / pers.</span>
                                </p>
                              </>
                            ) : (
                              <p className={`text-2xl font-extrabold ${hl ? "text-[#FFC94D]" : "text-[#0A7C95]"}`}>Prix sur devis</p>
                            )}
                            <Link
                              to={`/reserver/${p.slug}`}
                              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                hl
                                  ? "bg-gradient-to-r from-[#F28C0F] to-[#F2B705] text-[#06303A] shadow-md hover:brightness-105 focus-visible:ring-[#F2B705] focus-visible:ring-offset-[#06303A]"
                                  : "bg-[#064B5C] text-white hover:bg-[#0A7C95] focus-visible:ring-[#0A7C95]"
                              }`}
                            >
                              {p.price != null ? "Réserver ce forfait" : "Demander un devis"}
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
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