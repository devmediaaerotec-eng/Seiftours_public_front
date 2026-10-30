import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  ArrowUp,
  Navigation,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AGENCY } from "@/lib/agency";

/* -------------------------------------------------------------------------- */
/*  Agency details: edit them in src/lib/agency.ts (shared with the Contact page) */
/* -------------------------------------------------------------------------- */
const {
  phones: PHONES,
  whatsapp: WHATSAPP_NUMBER,
  email: EMAIL,
  address: ADDRESS,
} = AGENCY;

const AGENCY_MAP = AGENCY as typeof AGENCY & {
  mapEmbedUrl?: string;
  mapsLink?: string;
  mapQuery?: string;
};
const MAP_QUERY = AGENCY_MAP.mapQuery ?? `Seif Tours, ${ADDRESS}`;
const MAP_EMBED_URL =
  AGENCY_MAP.mapEmbedUrl ??
  `https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=15&output=embed`;
const DIRECTIONS_URL =
  AGENCY_MAP.mapsLink ??
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MAP_QUERY)}`;
const OPEN_MAP_URL =
  AGENCY_MAP.mapsLink ??
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_QUERY)}`;

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/share/1YMv5nJFbZ/?mibextid=wwXIfr", Icon: FacebookIcon },
  { label: "Instagram", href: "https://www.instagram.com/safes_tour/", Icon: InstagramIcon },
  { label: "WhatsApp", href: `https://wa.me/${WHATSAPP_NUMBER}`, Icon: MessageCircle },
];

/* -------------------------------------------------------------------------- */
/*  Texts                                                                     */
/* -------------------------------------------------------------------------- */
const FR = {
  findUs: "Nous trouver",
  findUsText:
    "Passez nous voir à l'agence ou contactez-nous, nous vous répondons avec plaisir.",
  directions: "Itinéraire",
  openMap: "Ouvrir dans Google Maps",
  mapTitle: "Localisation de l'agence Seif Tours",
  call: "Appeler",
  address: "Adresse",
  phone: "Téléphone",
  email: "E-mail",
  hoursTitle: "Horaires",
  hours: [
    { label: "Lun – Ven", time: "8h30 – 17h30" },
    { label: "Samedi", time: "8h30 – 13h00" },
  ],
  about:
    "Votre agence de voyages en Tunisie : hôtels, voyages organisés, circuits, Omra, vols et location de bus touristique.",
  follow: "Suivez-nous",
  whatsappText: "Une question ? Écrivez-nous sur WhatsApp.",
  whatsappButton: "Écrire sur WhatsApp",
  whatsappMessage: "Bonjour Seif Tours, je souhaite avoir des informations.",
  rights: "Tous droits réservés.",
  backToTop: "Retour en haut",
  openNow: "Ouvert maintenant",
  legal: "Mentions légales",
};

const EN: typeof FR = {
  findUs: "Find us",
  findUsText: "Drop by the agency or get in touch, we'll be happy to help.",
  directions: "Directions",
  openMap: "Open in Google Maps",
  mapTitle: "Seif Tours agency location",
  call: "Call",
  address: "Address",
  phone: "Phone",
  email: "Email",
  hoursTitle: "Opening hours",
  hours: [
    { label: "Mon – Fri", time: "8:30 am – 5:30 pm" },
    { label: "Saturday", time: "8:30 am – 1:00 pm" },
  ],
  about:
    "Your travel agency in Tunisia: hotels, organized trips, tours, Omra, flights and tourist bus rental.",
  follow: "Follow us",
  whatsappText: "A question? Message us on WhatsApp.",
  whatsappButton: "Message on WhatsApp",
  whatsappMessage: "Hello Seif Tours, I would like some information.",
  rights: "All rights reserved.",
  backToTop: "Back to top",
  openNow: "Open now",
  legal: "Legal notice",
};

const LEGAL_LINK = { to: "/mentions-legales" };

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                    */
/* -------------------------------------------------------------------------- */
function ColumnTitle({ children }: { children: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#06303A]">
        {children}
      </h2>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="h-0.5 w-8 rounded-full bg-[#E3A312]" />
        <span className="h-0.5 w-2 rounded-full bg-[#0A7C95]/50" />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8F5F8] to-[#D6EEF3] text-[#0A7C95] ring-1 ring-[#0A7C95]/10 transition-colors group-hover:from-[#0A7C95] group-hover:to-[#064B5C] group-hover:text-white group-hover:ring-[#0A7C95]">
        {icon}
      </span>
      <div className="min-w-0 text-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <div className="mt-0.5 font-semibold text-[#06303A]">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */
export default function Footer() {
  const { lang } = useLanguage();
  const L = lang === "FR" ? FR : EN;
  const year = new Date().getFullYear();
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    L.whatsappMessage
  )}`;

  return (
    <footer className="mt-16 bg-gradient-to-b from-[#F2F9FB] to-[#EAF3F6] text-gray-600">
      {/* Top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#064B5C] via-[#0A7C95] to-[#E3A312]" />

      <div className="mx-auto max-w-[1700px] px-4 pb-10 pt-14 sm:px-6 lg:px-8">
        {/* ───────────────────────── Location ───────────────────────── */}
        <section
          aria-labelledby="footer-location"
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]"
        >
          {/* Agency card */}
          <div className="relative overflow-hidden rounded-3xl border border-[#0A7C95]/15 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(6,75,92,0.15)] sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-[#E3A312]/15 to-transparent blur-2xl"
            />

            <div className="relative">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#E3A312]" aria-hidden="true" />
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#E3A312]">
                  Seif Tours
                </p>
              </div>
              <h2
                id="footer-location"
                className="mt-2 text-2xl font-extrabold text-[#06303A]"
              >
                {L.findUs}
              </h2>
              <div className="mt-2 h-1 w-10 rounded-full bg-[#E3A312]" />
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {L.findUsText}
              </p>

              <address className="mt-6 space-y-4 not-italic">
                <InfoRow
                  icon={<MapPin className="h-[18px] w-[18px]" aria-hidden="true" />}
                  label={L.address}
                >
                  {ADDRESS}
                </InfoRow>

                <InfoRow
                  icon={<Phone className="h-[18px] w-[18px]" aria-hidden="true" />}
                  label={L.phone}
                >
                  <span className="flex flex-col">
                    {PHONES.map((p) => (
                      <a
                        key={p.href}
                        href={p.href}
                        className="transition-colors hover:text-[#0A7C95]"
                      >
                        {p.display}
                      </a>
                    ))}
                  </span>
                </InfoRow>

                <InfoRow
                  icon={<Mail className="h-[18px] w-[18px]" aria-hidden="true" />}
                  label={L.email}
                >
                  <a
                    href={`mailto:${EMAIL}`}
                    className="break-all transition-colors hover:text-[#0A7C95]"
                  >
                    {EMAIL}
                  </a>
                </InfoRow>

                <InfoRow
                  icon={<Clock className="h-[18px] w-[18px]" aria-hidden="true" />}
                  label={L.hoursTitle}
                >
                  <span className="flex flex-col gap-0.5">
                    {L.hours.map((h) => (
                      <span key={h.label} className="flex gap-3">
                        <span className="w-20 shrink-0 font-normal text-gray-500">
                          {h.label}
                        </span>
                        <span>{h.time}</span>
                      </span>
                    ))}
                  </span>
                </InfoRow>
              </address>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0A7C95] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#064B5C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2"
                >
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  {L.directions}
                </a>
                <a
                  href={PHONES[0].href}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[#0A7C95] px-5 py-2 text-sm font-bold text-[#0A7C95] transition hover:bg-[#E8F5F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {L.call}
                </a>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="relative min-h-[340px] overflow-hidden rounded-3xl border border-[#0A7C95]/15 bg-gray-100 shadow-[0_8px_30px_-12px_rgba(6,75,92,0.15)]">
            <iframe
              title={L.mapTitle}
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#064B5C]/35 to-transparent"
            />
            <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-[#0A7C95] shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#25D366]" />
              </span>
              {L.openNow}
            </div>

            <a
              href={OPEN_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-md transition hover:text-[#0A7C95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              {L.openMap}
            </a>
          </div>
        </section>

        {/* ───────────────────────── Brand + Socials ───────────────────────── */}
        <div className="mt-14 grid grid-cols-1 gap-10 border-t border-[#0A7C95]/10 pt-12 lg:grid-cols-[1.8fr_1fr]">
          {/* Brand */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E3A312]/40 bg-white p-1.5 shadow-sm">
                <img
                  src="/logoseif.png"
                  alt="Seif Tours"
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-2xl font-extrabold tracking-tight text-[#06303A]">
                  Seif<span className="text-[#B8800A]"> Tours</span>
                </span>
                <span className="mt-1 text-[11px] font-semibold text-[#0A7C95]">
                  Seif Tours is a Safe Tours
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-600">
              {L.about}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0A7C95]/10 px-2.5 py-1 text-[11px] font-bold text-[#0A7C95]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                +10 ans d'expérience
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E3A312]/15 px-2.5 py-1 text-[11px] font-bold text-[#B8800A]">
                Agence agréée
              </span>
            </div>
          </div>

          {/* Social + WhatsApp */}
          <div>
            <ColumnTitle>{L.follow}</ColumnTitle>
            <div className="flex gap-2.5">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0A7C95] shadow-sm ring-1 ring-[#0A7C95]/15 transition hover:-translate-y-0.5 hover:bg-[#0A7C95] hover:text-white hover:ring-[#0A7C95] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-[#0A7C95]/15 bg-white p-4 shadow-sm">
              <p className="text-sm leading-relaxed text-gray-600">
                {L.whatsappText}
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E3A312] to-[#F2B705] px-4 py-2.5 text-sm font-bold text-[#06303A] shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {L.whatsappButton}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────── Bottom bar ───────────────────────── */}
      <div className="border-t border-[#0A7C95]/15 bg-[#064B5C] text-white">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-4 py-4 text-xs sm:flex-row sm:px-6 lg:px-8">
          <p className="text-white/80">
            © {year}{" "}
            <span className="font-semibold text-white">Seif Tours</span>.{" "}
            {L.rights}
          </p>

          <div className="flex items-center gap-5">
            <Link
              to={LEGAL_LINK.to}
              className="text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              {L.legal}
            </Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label={L.backToTop}
              title={L.backToTop}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition hover:bg-[#E3A312] hover:text-[#06303A] hover:ring-[#E3A312] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}