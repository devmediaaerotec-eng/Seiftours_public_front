import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SectionHeading from "@/components/SectionHeading";

interface FaqItem {
  q: { fr: string; en: string };
  a: { fr: string; en: string };
}

const FAQ: FaqItem[] = [
  {
    q: {
      fr: "Comment obtenir un devis pour un voyage ou un hôtel ?",
      en: "How do I get a quote for a trip or hotel?",
    },
    a: {
      fr: "Remplissez le formulaire de contact ou appelez-nous directement. Nous revenons vers vous sous 24 h ouvrées avec une proposition adaptée à votre budget et vos dates.",
      en: "Fill in the contact form or call us directly. We get back to you within 24 business hours with a proposal tailored to your budget and dates.",
    },
  },
  {
    q: {
      fr: "Quels sont les modes de paiement acceptés ?",
      en: "What payment methods do you accept?",
    },
    a: {
      fr: "Nous acceptons les virements bancaires, les cartes bancaires et les espèces en agence. Un acompte est demandé à la réservation, le solde avant le départ.",
      en: "We accept bank transfers, credit cards and cash at our office. A deposit is required at booking, with the balance due before departure.",
    },
  },
  {
    q: {
      fr: "Puis-je annuler ou modifier ma réservation ?",
      en: "Can I cancel or modify my booking?",
    },
    a: {
      fr: "Oui. Les conditions d'annulation dépendent du prestataire (hôtel, compagnie aérienne, transporteur). Elles sont précisées dans votre devis avant validation. Contactez-nous au plus tôt pour toute modification.",
      en: "Yes. Cancellation terms depend on the provider (hotel, airline, transport). They are specified in your quote before confirmation. Contact us as early as possible for any change.",
    },
  },
  {
    q: {
      fr: "Proposez-vous des voyages pour groupes ou entreprises ?",
      en: "Do you offer trips for groups or companies?",
    },
    a: {
      fr: "Absolument. Nous organisons des séminaires, incentives, voyages scolaires et événements familiaux. Demandez un devis dédié : nous adaptons le programme, l'hébergement et le transport à la taille du groupe.",
      en: "Absolutely. We organise seminars, incentives, school trips and family events. Request a dedicated quote: we tailor the programme, accommodation and transport to your group size.",
    },
  },
  {
    q: {
      fr: "Êtes-vous joignables en cas de problème pendant le voyage ?",
      en: "Are you reachable if there's a problem during the trip?",
    },
    a: {
      fr: "Oui. Chaque client dispose d'un numéro d'urgence joignable 7j/7 pendant toute la durée de son séjour. Nos partenaires locaux sont également disponibles sur place.",
      en: "Yes. Every client has an emergency number available 7 days a week throughout their stay. Our local partners are also available on site.",
    },
  },
];

export default function Testimonials() {
  const { lang } = useLanguage();
  const fr = lang === "FR";
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative overflow-hidden bg-white py-14 lg:py-20">
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-[#0A7C95]/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-[#F2B705]/10 blur-3xl" />

      <div className="relative mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={fr ? "Questions fréquentes" : "FAQ"}
          title={fr ? "Vos questions," : "Your questions,"}
          highlight={fr ? "nos réponses" : "answered"}
          subtitle={
            fr
              ? "Tout ce qu'il faut savoir avant de réserver votre prochain voyage."
              : "Everything you need to know before booking your next trip."
          }
        />

        <ul className="mt-10 space-y-3 lg:mt-12">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <li
                key={i}
                className={`overflow-hidden rounded-2xl border bg-white transition ${
                  isOpen
                    ? "border-[#0A7C95]/30 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-gray-50/50 sm:px-6"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                      isOpen
                        ? "bg-[#E8F5F8] text-[#0A7C95]"
                        : "bg-gray-100 text-gray-400"
                    }`}
                    aria-hidden="true"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-[15px] font-bold text-[#06303A] sm:text-base">
                    {item.q[fr ? "fr" : "en"]}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#0A7C95]" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  hidden={!isOpen}
                  className="px-5 pb-4 text-sm leading-relaxed text-gray-600 sm:px-6 sm:pb-5"
                >
                  <p className="pl-11">{item.a[fr ? "fr" : "en"]}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-center text-sm text-gray-500">
          {fr ? "Vous ne trouvez pas votre réponse ?" : "Can't find your answer?"}{" "}
          <a
            href="/contact"
            className="font-semibold text-[#0A7C95] underline-offset-2 hover:underline"
          >
            {fr ? "Contactez-nous" : "Contact us"}
          </a>
        </p>
      </div>
    </section>
  );
}