import { Link } from "react-router-dom";
import { Phone, Mail, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CtaBanner() {
  const { lang } = useLanguage();
  const fr = lang === "FR";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#06303A] via-[#064B5C] to-[#0A7C95] py-14 text-white lg:py-20">
      {/* Halos flous */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#F2B705]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1400px] px-4 text-center sm:px-6 lg:px-8">
        {/* Badge */}
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#F2B705] ring-1 ring-white/20 backdrop-blur-sm">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {fr ? "Prêt à partir ?" : "Ready to go?"}
        </p>

        {/* Titre */}
        <h2 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
          {fr ? (
            <>
              Votre prochain voyage commence{" "}
              <span className="text-[#F2B705]">ici</span>
            </>
          ) : (
            <>
              Your next trip starts <span className="text-[#F2B705]">here</span>
            </>
          )}
        </h2>

        {/* Sous-titre */}
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
          {fr
            ? "Hôtels, circuits, voyages organisés, Omra, vols et transport. Un seul interlocuteur pour tout votre séjour."
            : "Hotels, tours, organised trips, Umrah, flights and transport. A single contact for your whole stay."}
        </p>

        {/* Boutons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/contact"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 text-base font-bold text-[#06303A] shadow-lg transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#064B5C]"
          >
            {fr ? "Demander un devis" : "Request a quote"}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          <a
            href="tel:+21620956714"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/40 px-6 text-base font-semibold text-white transition hover:bg-white/10"
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
            +216 20 956 714
          </a>
        </div>

        {/* Lien secondaire */}
        <a
          href="mailto:contact@seiftours.tn"
          className="mt-6 inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          contact@seiftours.tn
        </a>
      </div>
    </section>
  );
}