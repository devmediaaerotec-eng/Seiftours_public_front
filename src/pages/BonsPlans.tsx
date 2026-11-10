import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import ListState from "@/components/ListState";
import { CardGridSkeleton } from "@/components/Loader";
import { useLanguage } from "@/contexts/LanguageContext";
import { Flame, Clock, MapPin, Tag, ArrowRight } from "lucide-react";
import { useDeals, type Deal } from "@/hooks/Usedeals";

const CURRENCY: Record<string, string> = { EUR: "€", USD: "$" };
const amount = (n: number, cur: string) =>
  cur === "TND" ? `${n.toLocaleString("fr-FR")} TND` : `${n.toLocaleString("fr-FR")} ${CURRENCY[cur] ?? cur}`;


function expiry(iso: string | null): string | null {
  if (!iso) return null;
  const end = new Date(`${iso}T23:59:59`);
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (days <= 1) return "Dernier jour";
  if (days <= 14) return `Dans ${days} jours`;
  return `Jusqu'au ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

export default function BonsPlansPage() {
  const { lang } = useLanguage();
  const { categories, items, updatedAt, loading, error, retry } = useDeals(lang === "FR" ? "fr" : "en");
  const [params, setParams] = useSearchParams();

  // ?offre=slug (lien du menu) : catégorie inconnue = toutes
  const active = categories.some((c) => c.slug === params.get("offre")) ? params.get("offre")! : "";
  const visible = useMemo(() => (active ? items.filter((d) => d.category === active) : items), [items, active]);
  const maxDiscount = useMemo(() => Math.max(0, ...items.map((d) => d.discount_percent ?? 0)), [items]);

  const choose = (slug: string) => setParams(slug ? { offre: slug } : {}, { replace: true });
  const updated = updatedAt
    ? new Date(`${updatedAt}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  return (
    <Layout>
      <PageHero
        title="Bons plans"
         badge={maxDiscount > 0 ? `Jusqu’à -${maxDiscount}%` : "Offres exclusives"}
        breadcrumb="Bons plans"
      />

      <section className="relative z-10 -mt-10 px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 py-5 shadow-2xl sm:flex-row sm:items-center sm:px-8">
          <div className="flex items-center gap-4 text-[#06303A]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#06303A] text-[#F2B705]">
              <Flame className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-extrabold">Promotions flash : ne manquez pas nos offres !</p>
              <p className="text-sm font-medium opacity-80">Nouvelles offres régulièrement, places limitées</p>
            </div>
          </div>
          {updated && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-[#06303A]">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Mis à jour le {updated}
            </span>
          )}
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          {/* Filtres : catégories de la base */}
          {categories.length > 1 && (
            <div role="group" aria-label="Catégories" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              {[{ slug: "", name: "Toutes", count: items.length }, ...categories].map((c) => {
                const on = c.slug === active;
                return (
                  <button
                    key={c.slug || "all"}
                    type="button"
                    onClick={() => choose(c.slug)}
                    aria-pressed={on}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 ${
                      on
                        ? "border-[#064B5C] bg-[#064B5C] text-white shadow-md"
                        : "border-gray-200 bg-white text-[#06303A] hover:border-[#0A7C95]/40 hover:text-[#0A7C95]"
                    }`}
                  >
                    {c.name}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>{c.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {loading ? (
            <CardGridSkeleton count={6} />
          ) : error || visible.length === 0 ? (
            <ListState
              error={!!error}
              onRetry={retry}
              icon={Tag}
              title="De nouveaux bons plans arrivent"
              text="Aucune offre n'est en cours pour le moment. Dites-nous ce que vous cherchez, nous vous préparons un tarif."
              contactSubject="general"
            />
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((d: Deal) => {
                const end = expiry(d.valid_until);
                return (
                  <li key={d.id}>
                    <Link
                      to={d.to}
                      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#064B5C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2"
                    >
                      <div className="skeleton relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#064B5C] to-[#0A7C95]">
                        {d.image_url && (
                          <img
                            src={d.image_url}
                            alt={d.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#031E26]/70 to-transparent" />
                        {d.discount_label && (
                          <span className="absolute left-3 top-3 rounded-full bg-[#F2B705] px-3 py-1 text-sm font-extrabold text-[#06303A] shadow-lg">
                            {d.discount_label}
                          </span>
                        )}
                        {end && (
                          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#06303A]/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                            <Clock className="h-3 w-3 text-[#F2B705]" aria-hidden="true" />
                            {end}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#0A7C95]">
                          <Tag className="h-3 w-3" aria-hidden="true" /> {d.category_name}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-lg font-bold text-[#06303A] transition-colors group-hover:text-[#0A7C95]">{d.title}</h3>
                        {(d.location || d.nights) && (
                          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-sm text-gray-500">
                            {d.location && (<><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {d.location}</>)}
                            {d.location && d.nights && <span className="mx-1" aria-hidden="true">•</span>}
                            {d.nights && <span>{d.nights} nuits</span>}
                          </p>
                        )}
                        {d.description && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{d.description}</p>}

                        <div className="mt-auto pt-5">
                          <div className="flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
                            <div>
                              {d.price != null ? (
                                <>
                                  {d.old_price && (
                                    <p className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-400 line-through">{amount(d.old_price, d.currency)}</span>
                                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                        -{amount(d.old_price - d.price, d.currency)}
                                      </span>
                                    </p>
                                  )}
                                  <p className="flex items-baseline gap-1">
                                    <span className="text-2xl font-extrabold text-[#0A7C95]">{amount(d.price, d.currency)}</span>
                                    <span className="text-xs text-gray-500">/ pers.</span>
                                  </p>
                                </>
                              ) : (
                                <p className="text-lg font-extrabold text-[#0A7C95]">Prix sur devis</p>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-4 py-2.5 text-sm font-bold text-[#06303A] shadow-md transition group-hover:brightness-105">
                              Profiter
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                            </span>
                          </div>
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