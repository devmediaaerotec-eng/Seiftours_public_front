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

export default function BonsPlans() {
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
        {/* Light background starts below the overlap, so the hero stays visible behind the banner */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-10 -z-10 bg-brand-50" />

        <div className="relative mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 overflow-hidden rounded-3xl bg-brand-900 px-6 py-5 shadow-xl ring-1 ring-white/10 sm:flex-row sm:items-center sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,183,5,0.22),transparent_55%)]"
          />
          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-400 ring-1 ring-gold-400/30">
              <Flame className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-extrabold text-white">Promotions flash : ne manquez pas nos offres !</p>
              <p className="text-sm font-medium text-white/70">Nouvelles offres régulièrement, places limitées</p>
            </div>
          </div>
          {updated && (
            <span className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15">
              <Clock className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" /> Mis à jour le {updated}
            </span>
          )}
        </div>
      </section>

      <section className="bg-brand-50 pb-16 pt-10 lg:pb-20 lg:pt-12">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          {/* Filtres : catégories de la base */}
          {categories.length > 1 && (
            <div
              role="group"
              aria-label="Catégories"
              className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
            >
              {[{ slug: "", name: "Toutes", count: items.length }, ...categories].map((c) => {
                const on = c.slug === active;
                return (
                  <button
                    key={c.slug || "all"}
                    type="button"
                    onClick={() => choose(c.slug)}
                    aria-pressed={on}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-50 ${
                      on
                        ? "border-brand-800 bg-brand-800 text-white shadow-md"
                        : "border-brand-600/15 bg-white text-brand-900 hover:border-brand-600/40 hover:text-brand-600"
                    }`}
                  >
                    {c.name}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        on ? "bg-white/20 text-white" : "bg-brand-100 text-brand-800"
                      }`}
                    >
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && !error && visible.length > 0 && (
            <p className="mb-5 text-sm font-medium text-gray-500" aria-live="polite">
              {visible.length} offre{visible.length > 1 ? "s" : ""} disponible{visible.length > 1 ? "s" : ""}
            </p>
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
                      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_-12px_rgba(6,48,58,0.25)] ring-1 ring-brand-800/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-14px_rgba(6,48,58,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <div className="skeleton relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-brand-800 to-brand-600">
                        {d.image_url && (
                          <img
                            src={d.image_url}
                            alt={d.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                          />
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-950/55 to-transparent" />
                        {d.discount_label && (
                          <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-3 py-1 text-sm font-extrabold text-brand-950 shadow-md">
                            {d.discount_label}
                          </span>
                        )}
                        {end && (
                          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-brand-900 shadow-sm backdrop-blur-sm">
                            <Clock className="h-3 w-3 text-brand-600" aria-hidden="true" />
                            {end}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <p className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-800">
                          <Tag className="h-3 w-3" aria-hidden="true" /> {d.category_name}
                        </p>
                        <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-snug text-brand-900 transition-colors group-hover:text-brand-600">
                          {d.title}
                        </h3>
                        {(d.location || d.nights) && (
                          <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-sm text-gray-500">
                            {d.location && (
                              <>
                                <MapPin className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> {d.location}
                              </>
                            )}
                            {d.location && d.nights && <span className="mx-1" aria-hidden="true">•</span>}
                            {d.nights && <span>{d.nights} nuits</span>}
                          </p>
                        )}
                        {d.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">{d.description}</p>}

                        <div className="mt-auto pt-5">
                          <div className="flex items-end justify-between gap-3 border-t border-brand-100 pt-4">
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
                                    <span className="text-2xl font-extrabold text-brand-600">{amount(d.price, d.currency)}</span>
                                    <span className="text-xs text-gray-500">/ pers.</span>
                                  </p>
                                </>
                              ) : (
                                <p className="text-lg font-extrabold text-brand-600">Prix sur devis</p>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-100 px-4 py-2.5 text-sm font-bold text-brand-800 transition group-hover:bg-brand-600 group-hover:text-white">
                              Profiter
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
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