import { useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { AGENCY } from "@/lib/agency";
 
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowRight,

} from "lucide-react";


const API = import.meta.env.VITE_API_URL ?? "";

const PHONE_DISPLAY = AGENCY.phones[0].display;
const PHONE_HREF = AGENCY.phones[0].href;
const WHATSAPP_NUMBER = AGENCY.whatsapp;
const EMAIL = AGENCY.email;
const ADDRESS_LINES = [AGENCY.address];
const ADDRESS_MAPS_LINK = ""; // e.g. a Google Maps share link: shows a "Itinéraire" button when set
const MAP_EMBED_URL = ""; // Google Maps > Share > Embed a map > copy the src="…" value

const HOURS = [
  { fr: "Lundi – Vendredi", en: "Monday – Friday", time: "09:00 – 18:00" },
  { fr: "Samedi", en: "Saturday", time: "09:00 – 13:00" },
];

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/share/1YMv5nJFbZ/?mibextid=wwXIfr", Icon: FacebookIcon },
  { label: "Instagram", href: "https://www.instagram.com/safes_tour/", Icon: InstagramIcon },
  { label: "WhatsApp", href: `https://wa.me/${WHATSAPP_NUMBER}`, Icon: MessageCircle },
 ];

/* -------------------------------------------------------------------------- */
/*  Texts                                                                     */
/* -------------------------------------------------------------------------- */
const FR = {
  home: "Accueil",
  badge: "Une équipe à votre écoute",
  title: "Contactez-nous",

  infoTitle: "Nos coordonnées",
  call: "Appelez-nous",
  whatsapp: "WhatsApp",
  whatsappHint: "Écrivez-nous directement",
  email: "E-mail",
  address: "Adresse",
  directions: "Itinéraire",
  hours: "Horaires d'ouverture",
  follow: "Suivez-nous",
  formTitle: "Envoyez-nous un message",
  formSubtitle: "Remplissez le formulaire : notre équipe reçoit votre message et vous répond rapidement.",
  name: "Nom complet",
  namePh: "Votre nom",
  phone: "Téléphone",
  phonePh: "+216 …",
  emailLabel: "E-mail",
  emailPh: "vous@exemple.com",
  subject: "Sujet",
  message: "Votre message",
  messagePh: "Destination, dates, nombre de voyageurs, budget…",
  send: "Envoyer le message",
  sending: "Envoi en cours…",
  sendWhatsapp: "Écrire sur WhatsApp",
  errName: "Veuillez indiquer votre nom.",
  errContact: "Indiquez un numéro de téléphone ou un e-mail valide.",
  errPhone: "Numéro de téléphone invalide.",
  errEmail: "Adresse e-mail invalide.",
  errMessage: "Votre message est trop court (10 caractères minimum).",
  sentWhatsapp: "WhatsApp s'ouvre avec votre message prêt à envoyer. Il ne vous reste qu'à valider.",
  sentOk: "Message envoyé. Notre équipe vous répond très vite.",
  errServer: "Envoi impossible pour le moment. Réessayez ou écrivez-nous sur WhatsApp.",
  required: "Champs obligatoires : nom, message, et un téléphone ou un e-mail.",
   quickSubtitle: "Consultez directement nos offres.",
  subjects: {
    general: "Question générale",
    hotels: "Hôtels en Tunisie",
    omra: "Omra",
    trips: "Voyage organisé",
    flights: "Vols",
    circuits: "Circuits",
    transport: "Location de bus touristique",
  },
  mapTitle: "Localisation de l'agence Seif Tours",
  msgGreeting: "Bonjour Seif Tours,",
  msgName: "Nom",
  msgPhone: "Téléphone",
  msgEmail: "E-mail",
  msgSubject: "Sujet",
  msgMessage: "Message",
};

const EN: typeof FR = {
  home: "Home",
  badge: "A team ready to help",
  title: "Contact us",
   
  infoTitle: "Our details",
  call: "Call us",
  whatsapp: "WhatsApp",
  whatsappHint: "Message us directly",
  email: "Email",
  address: "Address",
  directions: "Directions",
  hours: "Opening hours",
  follow: "Follow us",
  formTitle: "Send us a message",
  formSubtitle: "Fill in the form: our team receives your message and replies quickly.",
  name: "Full name",
  namePh: "Your name",
  phone: "Phone",
  phonePh: "+216 …",
  emailLabel: "Email",
  emailPh: "you@example.com",
  subject: "Subject",
  message: "Your message",
  messagePh: "Destination, dates, number of travelers, budget…",
  send: "Send message",
  sending: "Sending…",
  sendWhatsapp: "Write on WhatsApp",
  errName: "Please enter your name.",
  errContact: "Enter a valid phone number or email.",
  errPhone: "Invalid phone number.",
  errEmail: "Invalid email address.",
  errMessage: "Your message is too short (10 characters minimum).",
  sentWhatsapp: "WhatsApp is opening with your message ready. Just press send.",
  sentOk: "Message sent. Our team will reply very soon.",
  errServer: "Could not send right now. Please try again or write to us on WhatsApp.",
  required: "Required: name, message, and a phone number or an email.",
   quickSubtitle: "Browse our offers directly.",
  subjects: {
    general: "General question",
    hotels: "Hotels in Tunisia",
    omra: "Omra",
    trips: "Organized trips",
    flights: "Flights",
    circuits: "Tours",
    transport: "Tourist bus rental",
  },
  mapTitle: "Seif Tours agency location",
  msgGreeting: "Hello Seif Tours,",
  msgName: "Name",
  msgPhone: "Phone",
  msgEmail: "Email",
  msgSubject: "Subject",
  msgMessage: "Message",
};

type SubjectKey = keyof typeof FR.subjects;
const SUBJECT_KEYS = Object.keys(FR.subjects) as SubjectKey[];



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
/*  Form helpers                                                              */
/* -------------------------------------------------------------------------- */
const inputClass = (error?: string) =>
  `w-full rounded-xl border bg-white px-3.5 py-3 text-[15px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-gray-300 focus:border-[#0A7C95] focus:ring-[#0A7C95]/20"
  }`;

function Field({
  id,
  label,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F5F8] text-[#0A7C95]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className="mt-0.5 text-[15px] font-semibold text-gray-900">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
interface FormValues {
  name: string;
  phone: string;
  email: string;
  subject: SubjectKey;
  message: string;
}

export default function Contact() {
  const { lang } = useLanguage();
  const L = lang === "FR" ? FR : EN;
  const [params] = useSearchParams();
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    phone: `${uid}-phone`,
    email: `${uid}-email`,
    subject: `${uid}-subject`,
    message: `${uid}-message`,
  };

  // /contact?subject=omra pre-selects the subject (useful for links from other pages)
  const paramSubject = params.get("subject") as SubjectKey | null;
  const [values, setValues] = useState<FormValues>({
    name: "",
    phone: "",
    email: "",
    subject: paramSubject && SUBJECT_KEYS.includes(paramSubject) ? paramSubject : "general",
    // Other pages can prefill the request (e.g. a flight picked on /vol)
    message: (params.get("message") ?? "").slice(0, 1000),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | "contact", string>>>({});
  const [sent, setSent] = useState<"whatsapp" | "api" | null>(null);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [trap, setTrap] = useState(""); // champ piège pour les robots : doit rester vide

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, ...(key === "phone" || key === "email" ? { contact: undefined } : {}) }));
    setSent(null);
    setServerError("");
  };

  const validate = () => {
    const next: typeof errors = {};
    const phone = values.phone.trim();
    const email = values.email.trim();

    if (values.name.trim().length < 2) next.name = L.errName;
    if (!phone && !email) next.contact = L.errContact;
    if (phone && phone.replace(/\D/g, "").length < 8) next.phone = L.errPhone;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) next.email = L.errEmail;
    if (values.message.trim().length < 10) next.message = L.errMessage;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildMessage = () => {
    const lines: string[] = [L.msgGreeting, "", `${L.msgName} : ${values.name.trim()}`];
    if (values.phone.trim()) lines.push(`${L.msgPhone} : ${values.phone.trim()}`);
    if (values.email.trim()) lines.push(`${L.msgEmail} : ${values.email.trim()}`);
    lines.push(
      `${L.msgSubject} : ${L.subjects[values.subject]}`,
      "",
      `${L.msgMessage} :`,
      values.message.trim()
    );
    return lines.join("\n");
  };

  const sendWhatsapp = () => {
    if (!validate()) return;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSent("whatsapp");
  };

  /** Enregistre le message dans l'espace d'administration de Seif Tours */
  const sendMessage = async () => {
    if (sending || !validate()) return;
    setSending(true);
    setServerError("");
    try {
      const res = await fetch(`${API}/api/public/contact-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          phone: values.phone.trim() || undefined,
          email: values.email.trim() || undefined,
          subject: values.subject,
          message: values.message.trim(),
          website: trap,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 422 && json.violations) setErrors(json.violations);
        else setServerError(json.message ?? L.errServer);
        return;
      }
      setSent("api");
      setValues((v) => ({ ...v, name: "", phone: "", email: "", message: "" }));
    } catch {
      setServerError(L.errServer);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    sendMessage(); // Enter key = envoi vers l'administration
  };

  const describedBy = (id: string, error?: string) => (error ? `${id}-error` : undefined);

  return (
    <Layout>
      {/* ─────────────────────────── Banner ─────────────────────────── */}
     <section className="relative overflow-hidden bg-[#064B5C] pb-28 pt-14 text-white lg:pb-18 lg:pt-16">
      <div className="absolute inset-0 bg-gradient-to-br from-[#06303A] via-[#064B5C] to-[#0A7C95] " />
        <svg
          className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] text-[#E3A312] opacity-45"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1.2" strokeDasharray="420 160" />
          <circle cx="100" cy="100" r="76" stroke="currentColor" strokeWidth="0.6" strokeDasharray="280 200" />
        </svg>

        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-white/75">
            <Link to="/" className="transition-colors hover:text-[#F2B705]">
              {L.home}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium text-white">{L.title}</span>
          </nav>

          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F2B705]" />
            {L.badge}
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">{L.title}</h1>
          <div className="mt-4 h-1 w-20 rounded-full bg-[#E3A312]" />
 
           <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={PHONE_HREF}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#06303A] shadow-lg transition hover:bg-[#E8F5F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]"
            >
              <Phone className="h-4 w-4 text-[#0A7C95]" aria-hidden="true" />
              {PHONE_DISPLAY}
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]"
            >
              <MessageCircle className="h-4 w-4 text-[#F2B705]" aria-hidden="true" />
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* flow-root keeps the tint from covering the banner where the cards overlap it */}
      <div className="flow-root bg-gradient-to-b from-[#E3F3F7] to-[#F2F9FB]">
      {/* ─────────────────── Info card + form (overlap the banner) ─────────────────── */}
      <div className="relative z-10 mx-auto -mt-12 max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.45fr]">
          {/* Contact details */}
          <aside className="relative overflow-hidden rounded-3xl border border-gray-100 border-t-4 border-t-[#E3A312] bg-white p-7 shadow-2xl sm:p-9">
            <svg
              className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 text-[#E3A312] opacity-25"
              viewBox="0 0 200 200"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1.5" strokeDasharray="420 160" />
            </svg>

            <h2 className="relative text-xl font-extrabold text-gray-900">{L.infoTitle}</h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-[#E3A312]" />

            <div className="relative mt-7 space-y-6">
              <InfoRow icon={<Phone className="h-5 w-5" aria-hidden="true" />} label={L.call}>
                <a href={PHONE_HREF} className="hover:text-[#0A7C95] hover:underline">
                  {PHONE_DISPLAY}
                </a>
              </InfoRow>

              <InfoRow icon={<MessageCircle className="h-5 w-5" aria-hidden="true" />} label={L.whatsapp}>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#0A7C95] hover:underline"
                >
                  {L.whatsappHint}
                </a>
              </InfoRow>

              <InfoRow icon={<Mail className="h-5 w-5" aria-hidden="true" />} label={L.email}>
                <a href={`mailto:${EMAIL}`} className="break-all hover:text-[#0A7C95] hover:underline">
                  {EMAIL}
                </a>
              </InfoRow>

              <InfoRow icon={<MapPin className="h-5 w-5" aria-hidden="true" />} label={L.address}>
                {ADDRESS_LINES.map((line) => (
                  <span key={line} className="block font-medium text-gray-700">
                    {line}
                  </span>
                ))}
                {ADDRESS_MAPS_LINK && (
                  <a
                    href={ADDRESS_MAPS_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0A7C95] hover:underline"
                  >
                    {L.directions}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </InfoRow>

              <InfoRow icon={<Clock className="h-5 w-5" aria-hidden="true" />} label={L.hours}>
                {HOURS.map((h) => (
                  <span key={h.fr} className="flex justify-between gap-6 font-medium text-gray-700">
                    <span>{lang === "FR" ? h.fr : h.en}</span>
                    <span className="text-gray-900">{h.time}</span>
                  </span>
                ))}
              </InfoRow>
            </div>

            <div className="relative mt-8 border-t border-gray-100 pt-6">
              <p className="mb-3 text-xs font-medium text-gray-500">{L.follow}</p>
              <div className="flex gap-3">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F5F8] text-[#0A7C95] transition-colors hover:bg-[#0A7C95] hover:text-white"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* Form: first on phones (that is what visitors come for), right column on desktop */}
          <section
            id="contact-form"
            className="order-first scroll-mt-24 rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl sm:p-9 lg:order-none"
          >
            <h2 className="text-xl font-extrabold text-gray-900 sm:text-2xl">{L.formTitle}</h2>
            <div className="mt-2 h-1 w-12 rounded-full bg-[#E3A312]" />
            <p className="mt-3 text-sm text-gray-600">{L.formSubtitle}</p>

            <form onSubmit={handleSubmit} noValidate className="relative mt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={ids.name} label={L.name} error={errors.name}>
                  <input
                    id={ids.name}
                    type="text"
                    autoComplete="name"
                    value={values.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder={L.namePh}
                    aria-invalid={!!errors.name}
                    aria-describedby={describedBy(ids.name, errors.name)}
                    className={inputClass(errors.name)}
                  />
                </Field>

                <Field id={ids.phone} label={L.phone} error={errors.phone ?? errors.contact}>
                  <input
                    id={ids.phone}
                    type="tel"
                    autoComplete="tel"
                    value={values.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder={L.phonePh}
                    aria-invalid={!!(errors.phone ?? errors.contact)}
                    aria-describedby={describedBy(ids.phone, errors.phone ?? errors.contact)}
                    className={inputClass(errors.phone ?? errors.contact)}
                  />
                </Field>

                <Field id={ids.email} label={L.emailLabel} error={errors.email}>
                  <input
                    id={ids.email}
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder={L.emailPh}
                    aria-invalid={!!errors.email}
                    aria-describedby={describedBy(ids.email, errors.email)}
                    className={inputClass(errors.email)}
                  />
                </Field>

                <Field id={ids.subject} label={L.subject}>
                  <select
                    id={ids.subject}
                    value={values.subject}
                    onChange={(e) => set("subject", e.target.value as SubjectKey)}
                    className={`${inputClass()} cursor-pointer`}
                  >
                    {SUBJECT_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {L.subjects[key]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id={ids.message} label={L.message} error={errors.message} className="sm:col-span-2">
                  <textarea
                    id={ids.message}
                    rows={6}
                    value={values.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder={L.messagePh}
                    aria-invalid={!!errors.message}
                    aria-describedby={describedBy(ids.message, errors.message)}
                    className={`${inputClass(errors.message)} resize-y`}
                  />
                </Field>
              </div>

              <p className="mt-3 text-xs text-gray-500">{L.required}</p>

              {/* Piège à robots : invisible pour les humains */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label>
                  Site web
                  <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={sending}
                  className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 text-base font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-5 w-5" aria-hidden="true" />
                  {sending ? L.sending : L.send}
                </button>
                <button
                  type="button"
                  onClick={sendWhatsapp}
                  className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#0A7C95] px-6 text-base font-bold text-[#0A7C95] transition hover:bg-[#0A7C95] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  {L.sendWhatsapp}
                </button>
              </div>

              {serverError && (
                <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {serverError}
                </p>
              )}

              {sent && (
                <p
                  role="status"
                  className="mt-4 flex items-start gap-2 rounded-xl bg-[#E8F5F8] px-4 py-3 text-sm font-medium text-gray-800"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0A7C95]" aria-hidden="true" />
                  {sent === "whatsapp" ? L.sentWhatsapp : L.sentOk}
                </p>
              )}
            </form>
          </section>
        </div>
      </div>

      {/* ───────────────────────── Map (optional) ───────────────────────── */}
      {MAP_EMBED_URL && (
        <section className="mx-auto mt-10 max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-gray-100 shadow-xl">
            <iframe
              title={L.mapTitle}
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-80 w-full border-0 lg:h-96"
            />
          </div>
        </section>
      )}
 
      </div>
    </Layout>
  );
}