import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Gem, BadgePercent, Headset, Users, MapPinned, Award, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SectionHeading from "@/components/SectionHeading";
import { useHomeStats } from "@/hooks/Usehome";

/** Arcs pointillés, même motif que le pied de page (ici en filigrane clair) */
function Arcs({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1" strokeDasharray="420 160" />
      <circle cx="100" cy="100" r="76" stroke="currentColor" strokeWidth="0.6" strokeDasharray="280 200" />
    </svg>
  );
}

/** « 50K+ » : le nombre monte jusqu'à sa valeur quand le bloc devient visible (sauf si « réduire les animations »). */
function CountUp({ value }: { value: string }) {
  const m = /^(\d+)(.*)$/.exec(value);
  const target = m ? Number(m[1]) : 0;
  const suffix = m?.[2] ?? "";
  const [n, setN] = useState(m ? 0 : target);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!m) return;
    const el = ref.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce || !("IntersectionObserver" in window)) { setN(target); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1200);
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!m) return <>{value}</>;
  return <span ref={ref} aria-label={value}>{n.toLocaleString("fr-FR")}{suffix}</span>;
}

interface Promise {
  icon: LucideIcon;
  fr: [string, string];
  en: [string, string];
  /** Classes complètes : Tailwind ne génère pas de classes construites dynamiquement */
  tile: string; glow: string; accent: string;
}

const PROMISES: Promise[] = [
  { icon: ShieldCheck,
    fr: ["Sécurité garantie", "Voyage protégé avec assurance complète et assistance 24/7"],
    en: ["Guaranteed security", "Protected trips with full insurance and 24/7 assistance"],
    tile: "from-[#0A7C95] to-[#064B5C]", glow: "bg-[#0A7C95]/15", accent: "text-[#0A7C95]" },
  { icon: Gem,
    fr: ["Qualité premium", "Hôtels et prestataires sélectionnés rigoureusement"],
    en: ["Premium quality", "Rigorously selected hotels and providers"],
    tile: "from-[#E3A312] to-[#B8800A]", glow: "bg-[#E3A312]/20", accent: "text-[#8A5F00]" },
  { icon: BadgePercent,
    fr: ["Meilleurs prix", "Tarifs compétitifs garantis, paiement en plusieurs fois"],
    en: ["Best prices", "Competitive prices guaranteed, installment payment available"],
    tile: "from-[#F28C0F] to-[#E3A312]", glow: "bg-[#F28C0F]/15", accent: "text-[#B8680A]" },
  { icon: Headset,
    fr: ["Support 24/7", "Notre équipe est disponible à tout moment pour vous aider"],
    en: ["24/7 Support", "Our team is available anytime to help you"],
    tile: "from-[#2BA3BD] to-[#0A7C95]", glow: "bg-[#2BA3BD]/15", accent: "text-[#0A7C95]" },
];

export default function Features() {
  const { t, lang } = useLanguage();
  const fr = lang === "FR";
  const { data: stats } = useHomeStats();     // chiffres de la base ; valeurs de repli si l'API est indisponible

  // Clients / expérience : réglages de la base, sinon valeurs de repli. Destinations : nombre réel (masqué si 0).
  const items: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: Users, value: stats?.clients ?? "10K+", label: t("feat.clients") },
    ...(stats && stats.destinations > 0 ? [{ icon: MapPinned, value: String(stats.destinations), label: t("feat.destinations") }] : []),
    { icon: Award, value: stats?.years ?? "11+", label: t("feat.experience") },
  ];

  return (
    <section className=" bg-gradient-to-b from-[#F2F9FB] to-white  py-14 lg:py-20">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#0A7C95]/10 bg-gradient-to-br from-[#E8F5F8] via-white to-[#FFF6DD] p-5 shadow-sm sm:p-8 lg:p-12">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <Arcs className="absolute -right-32 -top-32 h-[420px] w-[420px] text-[#E3A312] opacity-25" />
            <Arcs className="absolute -bottom-40 -left-40 h-[380px] w-[380px] text-[#0A7C95] opacity-[0.14]" />
          </div>

          <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
            {/* Titre + chiffres clés */}
            <div>
              <SectionHeading
                align="left"
                eyebrow={fr ? "Nos engagements" : "Our promise"}
                title={t("feat.title_1")}
                highlight={`${t("feat.title_2")} ?`}
                subtitle={fr ? "Plus de 15 ans d'expérience au service de vos voyages" : "Over 15 years of experience serving your travels"}
              />

              <dl className={`mt-8 grid gap-3 sm:gap-4 ${items.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {items.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex flex-col items-start rounded-2xl border border-white bg-white/80 p-3 shadow-sm backdrop-blur sm:p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A7C95] to-[#064B5C] text-white shadow-md shadow-[#0A7C95]/20 sm:h-10 sm:w-10">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </span>
                    <dd className="order-2 mt-3 text-2xl font-extrabold leading-none text-[#064B5C] sm:text-3xl">
                      <CountUp value={value} />
                    </dd>
                    <dt className="order-3 mt-1 text-[11px] font-medium leading-tight text-gray-500 sm:text-xs">{label}</dt>
                  </div>
                ))}
              </dl>

              <Link
                to="/contact"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 py-3 text-sm font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2"
              >
                {fr ? "Parler à un conseiller" : "Talk to an advisor"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {/* Engagements */}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {PROMISES.map(({ icon: Icon, fr: f, en: e, tile, glow, accent }) => {
                const [title, description] = fr ? f : e;
                return (
                  <li
                    key={f[0]}
                    className="group relative flex gap-4 overflow-hidden rounded-3xl border border-gray-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-xl hover:shadow-[#064B5C]/10 sm:flex-col sm:p-6"
                  >
                    <span className={`pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${glow}`} aria-hidden="true" />
                    <Icon
                      className={`pointer-events-none absolute -bottom-4 -right-3 h-24 w-24 -rotate-12 opacity-[0.07] transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:opacity-[0.12] ${accent}`}
                      strokeWidth={1.25}
                      aria-hidden="true"
                    />
                    <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ring-4 ring-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 sm:h-14 sm:w-14 ${tile}`}>
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <div className="relative">
                      <h3 className="font-extrabold text-[#06303A]">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}