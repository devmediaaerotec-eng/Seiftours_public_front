import { useEffect, useMemo, useState } from "react";
import { BedDouble, Route, Luggage, MoonStar, PlaneTakeoff, BusFront, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import SectionHeading from "@/components/SectionHeading";
import { useHomeCategories, type CategoryStats } from "@/hooks/Usehome";
import { getHotelCatalog } from "@/lib/hotelCatalog";

type Key = "hotels" | "circuits" | "organized" | "omra" | "flight" | "transport";

interface Cat {
  key: Key;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  to: string;
  unit?: [string, string];
  tile: string;
  glow: string;
  accent: string;
}

const CATS: Cat[] = [
  { key: "hotels", icon: BedDouble, titleKey: "cat.hotels", descKey: "cat.hotels_desc", to: "/hotels-tunisie", unit: ["hôtels", "hotels"],
    tile: "from-[#0A7C95] to-[#064B5C]", glow: "bg-[#0A7C95]/15", accent: "text-[#0A7C95]" },
  { key: "circuits", icon: Route, titleKey: "cat.circuits", descKey: "cat.circuits_desc", to: "/circuit", unit: ["circuits", "tours"],
    tile: "from-[#F28C0F] to-[#E3A312]", glow: "bg-[#F28C0F]/15", accent: "text-[#B8680A]" },
  { key: "organized", icon: Luggage, titleKey: "cat.organized", descKey: "cat.organized_desc", to: "/voyage-organise", unit: ["voyages", "trips"],
    tile: "from-[#064B5C] to-[#031E26]", glow: "bg-[#064B5C]/15", accent: "text-[#064B5C]" },
  { key: "omra", icon: MoonStar, titleKey: "cat.omra", descKey: "cat.omra_desc", to: "/omra", unit: ["forfaits", "packages"],
    tile: "from-[#E3A312] to-[#B8800A]", glow: "bg-[#E3A312]/20", accent: "text-[#8A5F00]" },
  { key: "flight", icon: PlaneTakeoff, titleKey: "cat.flight", descKey: "cat.flight_desc", to: "/vol",
    tile: "from-[#2BA3BD] to-[#0A7C95]", glow: "bg-[#2BA3BD]/15", accent: "text-[#0A7C95]" },
  { key: "transport", icon: BusFront, titleKey: "cat.transport", descKey: "cat.transport_desc", to: "/transport",
    tile: "from-[#06303A] to-[#0A7C95]", glow: "bg-[#06303A]/10", accent: "text-[#06303A]" },
];

export default function Categories() {
  const { t, lang, formatPrice } = useLanguage();
  const fr = lang === "FR";
  const { data: stats } = useHomeCategories();

  /* ---------------------------------------------------------------- */
  /*  Compte réel des hôtels MyGo (même source que la navbar)         */
  /* ---------------------------------------------------------------- */
  const [mygoHotelCount, setMygoHotelCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { hotels } = await getHotelCatalog();
        const valid = hotels.filter(
          (h) => h.Id != null && String(h.Name ?? "").trim().length > 0
        );
        if (!cancelled) setMygoHotelCount(valid.length);
      } catch (err) {
        console.error("[Categories] MyGo count failed:", err);
        if (!cancelled) setMygoHotelCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Fusion : MyGo remplace stats.hotels.count                       */
  /* ---------------------------------------------------------------- */
  const mergedStats = useMemo<CategoryStats | undefined>(() => {
    if (!stats && mygoHotelCount == null) return undefined;

    const base = stats ?? ({} as CategoryStats);
    return {
      ...base,
      hotels: {
        ...(base.hotels ?? { count: 0 }),
        count: mygoHotelCount ?? base.hotels?.count ?? 0,
      },
    };
  }, [stats, mygoHotelCount]);

  return (
    <section className="bg-[#F2F9FB] py-14 lg:py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={fr ? "Tout pour votre voyage" : "Everything for your trip"}
          title={t("categories.title_1")}
          highlight={t("categories.title_2")}
          subtitle={t("categories.subtitle")}
        />

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:mt-12 xl:grid-cols-6">
          {CATS.map((c) => {
            const s = c.unit ? mergedStats?.[c.key as keyof CategoryStats] : undefined;
            const empty = !!mergedStats && !!c.unit && (s?.count ?? 0) === 0;
            const Icon = c.icon;
            return (
              <li key={c.key}>
                <Link
                  to={c.to}
                  className={`group relative flex h-full min-h-[210px] flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-2xl hover:shadow-[#064B5C]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 sm:p-5 ${
                    empty ? "opacity-75" : ""
                  }`}
                >
                  <span className={`pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${c.glow}`} aria-hidden="true" />
                  <Icon
                    className={`pointer-events-none absolute -bottom-5 -right-4 h-28 w-28 -rotate-12 opacity-[0.07] transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:opacity-[0.12] ${c.accent}`}
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />

                  <div className="relative flex items-start justify-between">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ring-4 ring-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 sm:h-14 sm:w-14 ${c.tile}`}>
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-all duration-300 group-hover:bg-[#E3A312] group-hover:text-[#06303A]" aria-hidden="true">
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                    </span>
                  </div>

                  <h3 className="relative mt-4 text-[15px] font-extrabold text-[#06303A] sm:text-base">{t(c.titleKey)}</h3>
                  <p className="relative mt-1 text-xs leading-relaxed text-gray-500 sm:text-[13px]">{t(c.descKey)}</p>

                  {s && s.count > 0 && c.unit && (
                    <p className="relative mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4">
                      <span className={`rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold ${c.accent}`}>
                        {s.count} {c.unit[fr ? 0 : 1]}
                      </span>
                      {s.from != null && (
                        <span className="text-[11px] font-semibold text-gray-500">
                          {fr ? "dès" : "from"} <span className={`font-extrabold ${c.accent}`}>{formatPrice(s.from)}</span>
                        </span>
                      )}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}