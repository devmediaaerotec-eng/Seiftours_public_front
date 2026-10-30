import { MapPin, ArrowRight, ArrowUpRight, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import SectionHeading from "@/components/SectionHeading";
import { useHomeDestinations } from "@/hooks/Usehome";

// Bento (4 destinations) : la « coup de cœur » prend un bloc 2×2, la deuxième une tuile large.
// Avec moins de destinations, une grille régulière évite les trous.
const BENTO = ["lg:col-span-2 lg:row-span-2", "lg:col-span-2", "", ""];
const GRID: Record<number, string> = {
  1: "lg:grid-cols-1 lg:auto-rows-[340px]",
  2: "lg:grid-cols-2 lg:auto-rows-[340px]",
  3: "lg:grid-cols-3 lg:auto-rows-[340px]",
};

export default function Destinations() {
  const { t, lang, formatPrice } = useLanguage();
  const fr = lang === "FR";
  const { items, loading, error } = useHomeDestinations(fr ? "fr" : "en", 4);

  // Pas de destination publiée (ou API indisponible) : la section disparaît au lieu d'afficher un trou
  if (!loading && (error || items.length === 0)) return null;

  const bento = items.length >= 4;
  const gridCols = bento ? "lg:grid-cols-4 lg:auto-rows-[250px]" : GRID[items.length] ?? GRID[3];

  return (
    <section className="bg-[#F2F9FB] py-14 lg:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            align="left"
            eyebrow={fr ? "Inspiration" : "Get inspired"}
            title={t("dest.title_1")}
            highlight={t("dest.title_2")}
            subtitle={t("dest.subtitle")}
          />
          <Link
            to="/voyage-organise"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border-2 border-[#064B5C] px-5 py-2.5 text-sm font-bold text-[#064B5C] transition hover:bg-[#064B5C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 sm:self-end"
          >
            {fr ? "Voir toutes les destinations" : "View all destinations"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile : rangée à faire glisser · tablette : 2 colonnes · bureau : bento */}
        <ul
          className={`-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:mt-10 lg:gap-5 ${gridCols}`}
          aria-busy={loading}
        >
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <li key={i} className={`h-[380px] w-[80%] shrink-0 animate-pulse snap-start rounded-3xl bg-gray-200 sm:h-[340px] sm:w-auto lg:h-auto ${BENTO[i] ?? ""}`} />
              ))
            : items.map((dest, i) => (
                <li
                  key={dest.slug}
                  className={`h-[380px] w-[80%] shrink-0 snap-start sm:h-[340px] sm:w-auto lg:h-auto ${bento ? BENTO[i] ?? "" : ""}`}
                >
                  <Link
                    to={`/voyage-organise?destination=${dest.slug}`}
                    className="group relative block h-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#064B5C] to-[#0A7C95] shadow-md transition-shadow duration-300 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2"
                  >
                    {dest.image_url ? (
                      <img
                        src={dest.image_url}
                        alt={dest.name}
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <Globe className="absolute right-6 top-1/3 h-24 w-24 text-white/20" strokeWidth={1.25} aria-hidden="true" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#031E26]/90 via-[#031E26]/25 to-transparent" />

                    {dest.featured && (
                      <span className="absolute left-4 top-4 rounded-full bg-[#F2B705] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#06303A] shadow">
                        {fr ? "Coup de cœur" : "Top pick"}
                      </span>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                      <p className="flex flex-wrap items-center gap-x-1 text-xs font-medium text-white/85">
                        <MapPin className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden="true" />
                        {dest.country && <span>{dest.country}</span>}
                        {dest.country && <span className="mx-1 text-white/40" aria-hidden="true">•</span>}
                        <span>
                          {dest.tours} {fr ? (dest.tours > 1 ? "voyages" : "voyage") : dest.tours > 1 ? "trips" : "trip"}
                        </span>
                      </p>
                      <h3 className={`mt-1 font-extrabold leading-tight ${dest.featured && bento ? "text-2xl lg:text-4xl" : "text-2xl"}`}>
                        {dest.name}
                      </h3>
                      {dest.tagline && <p className="mt-1 line-clamp-2 text-sm text-white/80">{dest.tagline}</p>}

                      <div className="mt-3 flex items-end justify-between gap-3">
                        {dest.from != null ? (
                          <p>
                            <span className="block text-[11px] uppercase tracking-wider text-white/70">{t("common.from")}</span>
                            <span className="text-xl font-extrabold text-[#FFC94D]">{formatPrice(dest.from)}</span>
                          </p>
                        ) : (
                          <span />
                        )}
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E3A312] text-[#06303A] shadow-lg transition group-hover:rotate-45 group-hover:bg-[#F2B705]"
                          aria-hidden="true"
                        >
                          <ArrowUpRight className="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}