import { useEffect, useState } from "react";
import { MapPin, Award, Building2, Moon, Globe, Compass, ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBestSellers, type BestSeller } from "@/hooks/Usebestsellers";

const AUTOPLAY_MS = 5000;

const KIND: Record<BestSeller["kind"], { Icon: LucideIcon; fr: string; en: string }> = {
  hotel: { Icon: Building2, fr: "Hôtel", en: "Hotel" },
  omra: { Icon: Moon, fr: "Omra", en: "Omra" },
  organized: { Icon: Globe, fr: "Voyage organisé", en: "Organized trip" },
  circuit: { Icon: Compass, fr: "Circuit", en: "Tour" },
};

const frame = "relative h-[480px] select-none overflow-hidden rounded-3xl shadow-xl";

export default function BestSellerSlider() {
  const { lang, t, formatPrice } = useLanguage();
  const FR = lang === "FR";
  const { items, loading, error, retry } = useBestSellers(FR ? "fr" : "en", 6);

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [paused, setPaused] = useState(false);
  const count = items.length;

  // La liste peut changer (langue, rechargement) : on reste dans les bornes
  useEffect(() => { setActiveIndex((i) => (i < count ? i : 0)); }, [count]);

  // Autoplay : mis en pause au survol/focus, désactivé si « réduire les animations », inutile avec une seule offre
  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setDirection("next");
      setActiveIndex((prev) => (prev + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, count]);

  const goTo = (index: number) => { setDirection(index > activeIndex ? "next" : "prev"); setActiveIndex(index); };
  const next = () => { setDirection("next"); setActiveIndex((i) => (i + 1) % count); };
  const prev = () => { setDirection("prev"); setActiveIndex((i) => (i - 1 + count) % count); };

  if (loading) {
    return <div className={`${frame} animate-pulse bg-gradient-to-br from-[#064B5C] to-[#0A7C95]`} aria-busy="true" />;
  }

  // Aucune offre mise à la une (ou API indisponible) : bandeau neutre, jamais un trou dans la page
  if (error || count === 0) {
    return (
      <div className={`${frame} flex flex-col items-center justify-center bg-gradient-to-br from-[#064B5C] to-[#0A7C95] px-6 text-center text-white`}>
        <Award className="h-10 w-10 text-[#F2B705]" aria-hidden="true" />
        <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{FR ? "Nos meilleures offres arrivent" : "Our best deals are coming"}</h2>
        <p className="mt-2 max-w-md text-sm text-white/80">
          {error
            ? FR ? "Le service est momentanément indisponible." : "The service is temporarily unavailable."
            : FR ? "Découvrez en attendant tous nos bons plans." : "Meanwhile, browse all our deals."}
        </p>
        <div className="mt-5 flex gap-3">
          {error && (
            <button type="button" onClick={retry} className="rounded-xl border-2 border-white/70 px-5 py-2.5 text-sm font-bold hover:bg-white/10">
              {FR ? "Réessayer" : "Retry"}
            </button>
          )}
          <Link to="/bons-plans" className="rounded-xl bg-[#E3A312] px-5 py-2.5 text-sm font-bold text-[#06303A] hover:bg-[#F2B705]">
            {t("deals.view_all")} →
          </Link>
        </div>
      </div>
    );
  }

  const current = items[activeIndex];
  const { Icon } = KIND[current.kind];
  const category = current.category ?? KIND[current.kind][FR ? "fr" : "en"];
  const money = (n: number) => (current.currency === "TND" ? formatPrice(n) : `${n.toLocaleString(FR ? "fr-FR" : "en-GB")} ${current.currency}`);
  const nightsLabel = FR ? "nuits" : "nights";
  const seeOfferLabel = FR ? "Voir l'offre" : "See offer";

  const arrowClass =
    "absolute top-[42%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]";

  return (
    <div
      className={frame}
      role="region"
      aria-roledescription="carousel"
      aria-label={FR ? "Meilleures offres" : "Best deals"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Fond de repli si une offre n'a pas d'image */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#064B5C] to-[#0A7C95]" />

      {/* Images en fondu enchaîné (toutes montées : pas de flash) */}
      {items.map((slide, i) =>
        slide.image_url ? (
          <img
            key={slide.id}
            src={slide.image_url}
            alt={i === activeIndex ? slide.title : ""}
            aria-hidden={i !== activeIndex}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${i === activeIndex ? "opacity-100" : "opacity-0"}`}
          />
        ) : null
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#031E26]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#031E26]/90 via-[#064B5C]/25 to-transparent" />

      {count > 1 && (
        <>
          <button type="button" onClick={prev} aria-label={FR ? "Offre précédente" : "Previous deal"} className={`${arrowClass} left-3`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={next} aria-label={FR ? "Offre suivante" : "Next deal"} className={`${arrowClass} right-3`}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        key={`content-${current.id}`}
        aria-live="polite"
        className={`absolute inset-0 flex animate-in flex-col duration-500 fade-in ${direction === "next" ? "slide-in-from-right-4" : "slide-in-from-left-4"}`}
      >
        <div className="flex items-start justify-between p-4 pt-5 sm:px-6">
          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md">
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{category}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold text-[#06303A] shadow-md">
            <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Best Seller</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Le bas laisse la place à la carte de recherche qui chevauche le slider */}
        <div className="px-5 pb-[112px] sm:px-8">
          {current.discount && (
            <div className="mb-3 flex items-center gap-2.5">
              <span className="rounded-full bg-[#F2B705] px-2.5 py-0.5 text-[11px] font-extrabold text-[#06303A] shadow">{current.discount}</span>
            </div>
          )}

          <h2 className="mb-2 line-clamp-2 text-2xl font-extrabold leading-tight text-white drop-shadow-lg sm:text-3xl">{current.title}</h2>

          {(current.location || current.nights) && (
            <div className="mb-4 flex items-center gap-3">
              {current.location && (
                <div className="flex min-w-0 items-center gap-1.5 text-white/80">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate text-[13px]">{current.location}</span>
                </div>
              )}
              {current.nights && (
                <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[12px] text-white/80">
                  {current.nights} {nightsLabel}
                </span>
              )}
            </div>
          )}

          <div className="flex items-end justify-between gap-3">
            <div>
              {current.price != null ? (
                <>
                  {current.old_price && <p className="mb-1 text-xs leading-none text-white/60 line-through">{money(current.old_price)}</p>}
                  <p className="text-[28px] font-extrabold leading-none text-[#F2B705] drop-shadow">{money(current.price)}</p>
                </>
              ) : (
                <p className="text-xl font-extrabold text-[#F2B705]">{FR ? "Prix sur devis" : "Price on request"}</p>
              )}
            </div>

            <Link
              to={current.to}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#E3A312] px-5 py-2.5 text-sm font-bold text-[#06303A] shadow-xl transition hover:-translate-y-0.5 hover:bg-[#F2B705] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {seeOfferLabel}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[76px] flex items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-2">
          {count > 1 && items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === activeIndex}
              className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? "w-8 bg-[#F2B705]" : "w-2 bg-white/45 hover:bg-white/80"}`}
            />
          ))}
        </div>

        <Link to="/bons-plans" className="flex items-center gap-1.5 text-xs font-semibold text-white/90 transition-colors hover:text-[#F2B705]">
          {t("deals.view_all")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}