import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CreditCard, Loader2, Lock, MessageSquareText, PhoneCall, RefreshCw, Send, Store } from "lucide-react";
import Layout from "@/components/Layout";
import CheckoutSteps from "@/components/CheckoutSteps";
import BookingSummary from "@/components/BookingSummary";
import { BranchOption } from "@/components/BranchCard";
import { BRANCHES, type BranchId } from "@/lib/branches";
import { bookingApi, BookingApiError, type GuestDetails, type GuestTitle } from "@/lib/Bookingapi";
import { amountsFor } from "@/lib/Payment";
import { useBookingConfig } from "@/hooks/useBookingConfig";
import { diffDays, encodeRooms } from "@/lib/booking";
import { clearDraft, DRAFT_MAX_AGE_MS, loadDraft } from "@/lib/checkoutDraft";

/** request = reservation request, no payment (default) · card = online deposit (only if enabled on the server) */
type Method = "card" | "request";
type Errors = Partial<Record<keyof GuestDetails | "cgv" | "branch", string>>;

const TITLES: GuestTitle[] = ["Mlle", "Mme", "M."];
const MAX_NOTES = 2000;
const normalizePhone = (s: string) => s.replace(/[\s.\-()]/g, "").replace(/^00/, "+");

const REQUEST_STEPS = [
  "Vous envoyez votre demande : rien n'est payé en ligne.",
  "Notre agence vérifie la disponibilité auprès de l'hôtel et vous appelle pour confirmer le prix final.",
  "Vous confirmez, puis vous réglez directement dans l'une de nos agences.",
];

const inputClass = (error?: string) =>
  `w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-gray-900 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-gray-300 focus:border-brand-600 focus:ring-brand-600/20"
  }`;

function TextField({
  id,
  label,
  error,
  ...input
}: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-gray-600">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
        className={inputClass(error)}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function PayOption({
  selected,
  onSelect,
  icon,
  title,
  hint,
  badges,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
  badges?: string[];
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition focus-within:ring-2 focus-within:ring-brand-600/30 ${
        selected ? "border-brand-600 bg-brand-100/60" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <input
        type="radio"
        name="payment-method"
        checked={selected}
        onChange={onSelect}
        className="h-4 w-4 shrink-0 accent-brand-600"
      />
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-gray-900">{title}</span>
        <span className="block text-sm text-gray-600">{hint}</span>
      </span>
      {badges && (
        <span className="hidden gap-1.5 sm:flex">
          {badges.map((b) => (
            <span key={b} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-extrabold text-gray-600">
              {b}
            </span>
          ))}
        </span>
      )}
    </label>
  );
}

 
export default function Checkout() {
  const navigate = useNavigate();
  const [draft] = useState(loadDraft);

  const [guest, setGuest] = useState<GuestDetails>({ firstName: "", lastName: "", email: "", phone: "" });
  const [chosenMethod, setMethod] = useState<Method>("request");
  const [branchId, setBranchId] = useState<BranchId | null>(null); // optional: agency where the visitor would like to pay
  const [notes, setNotes] = useState("");
  const [cgv, setCgv] = useState(false);
  const [promo, setPromo] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Deposit rules + whether online payment is switched on by the server (off for now)
  const pricing = useBookingConfig(draft?.hotelId, draft?.checkIn);
  // Online payment off: every booking is a request, the agency calls back and the visitor pays at the agency
  const method: Method = pricing.paymentAvailable ? chosenMethod : "request";

  // Prices are only valid for a few minutes (the MyGo offer token expires)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!draft) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [draft]);

  // Coming back with the browser's back button from the payment page
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setBusy(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  /* ------------------------- no selection: start again ------------------------ */
  if (!draft) {
    return (
      <Layout>
        <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-gold-700" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Votre sélection a expiré</h1>
          <p className="mt-2 text-gray-600">Choisissez de nouveau un hôtel et une chambre pour continuer.</p>
          <Link
            to="/hotels-tunisie"
            className="mt-6 rounded-xl bg-gold-500 px-6 py-3 text-sm font-bold text-brand-950 shadow-md"
          >
            Voir les hôtels
          </Link>
        </div>
      </Layout>
    );
  }

  const nights = Math.max(1, diffDays(draft.checkIn, draft.checkOut));
  const amounts = amountsFor(draft.total, pricing.deposit, pricing.currency);
  const remainingMs = Math.max(0, draft.savedAt + DRAFT_MAX_AGE_MS - now);
  // Only an online payment needs a fresh offer; a request is re-priced by the server and confirmed by the agency
  const expired = method === "card" && remainingMs === 0;
  // "guests" is the URL parameter the hotel page reads: without it the rooms/children would reset to 2 adults
  const editHref = `/hotels/${draft.hotelId}?checkIn=${draft.checkIn}&checkOut=${draft.checkOut}&guests=${encodeRooms(draft.rooms)}`;

  const set = (patch: Partial<GuestDetails>) => {
    setGuest((g) => ({ ...g, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof Errors];
      return next;
    });
  };

  function validate(): Errors {
    const e: Errors = {};
    if (!normalizePhone(guest.phone).match(/^\+?\d{8,15}$/)) e.phone = "Numéro invalide (ex. 98 123 456 ou +216 98 123 456).";
    if (!/^\S+@\S+\.\S+$/.test(guest.email.trim())) e.email = "Adresse e-mail invalide.";
    if (!guest.title) e.title = "Choisissez une civilité.";
    if (guest.firstName.trim().length < 2) e.firstName = "Entrez votre prénom.";
    if (guest.lastName.trim().length < 2) e.lastName = "Entrez votre nom de famille.";
    if (!cgv) e.cgv = "Vous devez accepter les conditions générales de vente.";
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy || expired || !draft) return;

    const found = validate();
    setErrors(found);
    const first = (["phone", "email", "title", "firstName", "lastName", "branch", "cgv"] as const).find((k) => found[k]);
    if (first) {
      document.getElementById(`co-${first}`)?.focus();
      return;
    }

    setBusy(true);
    setSubmitError(null);
    try {
      const result = await bookingApi.create({
        mode: method === "card" ? "deposit" : "request",
        hotelId: draft.hotelId,
        hotelName: draft.hotelName,
        token: draft.token,
        roomId: draft.roomId,
        boardingId: draft.boardingId,
        roomName: draft.roomName,
        boardingName: draft.boardingName,
        checkIn: draft.checkIn,
        checkOut: draft.checkOut,
        rooms: draft.rooms,
        client: {
          title: guest.title,
          firstName: guest.firstName.trim(),
          lastName: guest.lastName.trim(),
          email: guest.email.trim(),
          phone: normalizePhone(guest.phone),
        },
        branchId: method === "request" ? (branchId ?? undefined) : undefined,
        notes: notes.trim() || undefined,
        displayedTotal: draft.total,
      });

      if (result.paymentUrl) {
        // Only ever send the visitor to a secure payment page
        if (new URL(result.paymentUrl).protocol !== "https:") throw new Error("Lien de paiement invalide.");
        window.location.assign(result.paymentUrl); // stay "busy": the page is leaving
        return;
      }
      clearDraft();
      // The name and e-mail travel in the navigation state (not in the URL, not stored on the server view)
      navigate(`/reservation/${result.reference}`, {
        state: { firstName: guest.firstName.trim(), email: guest.email.trim() },
      });
    } catch (e) {
      setSubmitError(e instanceof BookingApiError ? e.message : "Une erreur est survenue. Merci de réessayer.");
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <CheckoutSteps current={2} />

        <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-8">
            {expired && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-gold-500/40 bg-gold-50 p-4 text-sm text-gold-700">
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  Les tarifs datent de plus de 10 minutes.{" "}
                  <Link to={editHref} className="font-bold underline">
                    Actualiser les tarifs
                  </Link>{" "}
                  pour continuer.
                </p>
              </div>
            )}

            {/* ------------------------------ Coordonnées ----------------------------- */}
            <section aria-labelledby="co-details">
              <h1 id="co-details" className="text-2xl font-extrabold text-gray-900">
                Vos coordonnées
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                <span className="text-red-500">*</span> Champs obligatoires
              </p>

              <div className="mt-4 space-y-4 rounded-3xl border border-gray-200/70 bg-white p-5 shadow-sm sm:p-6">
                <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  {method === "card"
                    ? "Paiement 100% sécurisé"
                    : "Aucun paiement en ligne : vos coordonnées servent uniquement à vous recontacter"}
                </p>

                <TextField
                  id="co-phone"
                  label="Portable"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+216 …"
                  value={guest.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  error={errors.phone}
                />
                <TextField
                  id="co-email"
                  label="E-mail"
                  type="email"
                  autoComplete="email"
                  placeholder="email@exemple.com"
                  value={guest.email}
                  onChange={(e) => set({ email: e.target.value })}
                  error={errors.email}
                />

                <fieldset>
                  <legend className="mb-1 text-xs font-semibold text-gray-600">
                    Civilité <span className="text-red-500">*</span>
                  </legend>
                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                    {TITLES.map((t, i) => (
                      <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                        <input
                          id={i === 0 ? "co-title" : undefined}
                          type="radio"
                          name="title"
                          value={t}
                          checked={guest.title === t}
                          onChange={() => set({ title: t })}
                          className="h-4 w-4 accent-brand-600"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                  {errors.title && (
                    <p role="alert" className="mt-1 text-xs text-red-600">
                      {errors.title}
                    </p>
                  )}
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="co-firstName"
                    label="Prénom"
                    autoComplete="given-name"
                    value={guest.firstName}
                    onChange={(e) => set({ firstName: e.target.value })}
                    error={errors.firstName}
                  />
                  <TextField
                    id="co-lastName"
                    label="Nom de famille"
                    autoComplete="family-name"
                    value={guest.lastName}
                    onChange={(e) => set({ lastName: e.target.value })}
                    error={errors.lastName}
                  />
                </div>
              </div>
            </section>

            {/* --------------------------- Comment ça se passe --------------------------- */}
            {method === "request" && (
              <section aria-labelledby="co-how" className="rounded-3xl border border-brand-600/20 bg-brand-100/60 p-5 sm:p-6">
                <h2 id="co-how" className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                  <PhoneCall className="h-5 w-5 text-brand-600" aria-hidden="true" />
                  Ceci est une demande de réservation
                </h2>
                <ol className="mt-3 space-y-2 text-sm text-gray-700">
                  {REQUEST_STEPS.map((t, i) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{t}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* --------------- Paiement (seulement si activé côté serveur) --------------- */}
            {pricing.paymentAvailable && (
              <section aria-labelledby="co-pay">
                <h2 id="co-pay" className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
                  <CreditCard className="h-5 w-5 text-brand-600" aria-hidden="true" />
                  Comment souhaitez-vous réserver ?
                </h2>
                <div className="mt-4 space-y-3">
                  <PayOption
                    selected={method === "request"}
                    onSelect={() => setMethod("request")}
                    icon={<Store className="h-5 w-5" aria-hidden="true" />}
                    title="Demande de réservation"
                    hint="Notre agence vous rappelle pour confirmer ; vous réglez en agence"
                  />
                  <PayOption
                    selected={method === "card"}
                    onSelect={() => setMethod("card")}
                    icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
                    title="Carte bancaire"
                    hint={`Acompte de ${amounts.deposit} TND en ligne, le reste à l'hôtel`}
                    badges={["CIB", "VISA", "MasterCard"]}
                  />
                </div>
                {method === "card" && (
                  <p className="mt-3 text-sm text-gray-600">
                    Vous serez redirigé vers la page de paiement sécurisée ClicToPay. Vos données bancaires ne passent
                    jamais par notre site.
                  </p>
                )}
              </section>
            )}

            {/* --------------------- Agence préférée (facultatif) --------------------- */}
            {method === "request" && (
              <section role="radiogroup" aria-labelledby="co-branch-title">
                <h2 id="co-branch-title" className="flex flex-wrap items-center gap-2 text-lg font-bold text-gray-900">
                  <Store className="h-5 w-5 text-brand-600" aria-hidden="true" />
                  Dans quelle agence souhaitez-vous régler ?
                  <span className="text-sm font-normal text-gray-500">(facultatif)</span>
                </h2>
                <div className="mt-3 space-y-3">
                  {BRANCHES.map((b, i) => (
                    <BranchOption
                      key={b.id}
                      id={i === 0 ? "co-branch" : undefined}
                      branch={b}
                      selected={branchId === b.id}
                      onSelect={() => setBranchId(b.id)}
                    />
                  ))}
                </div>
                {branchId && (
                  <button
                    type="button"
                    onClick={() => setBranchId(null)}
                    className="mt-2 text-sm font-semibold text-brand-600 underline"
                  >
                    Pas de préférence pour le moment
                  </button>
                )}
              </section>
            )}

            {/* ------------------------------ Remarques ------------------------------ */}
            <section>
              <label htmlFor="co-notes" className="flex flex-wrap items-center gap-2 text-lg font-bold text-gray-900">
                <MessageSquareText className="h-5 w-5 text-brand-600" aria-hidden="true" />
                Remarques
                <span className="text-sm font-normal text-gray-500">(facultatif)</span>
              </label>
              <textarea
                id="co-notes"
                rows={3}
                maxLength={MAX_NOTES}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex. chambre au calme, lit bébé, heure d'arrivée, meilleur moment pour vous appeler…"
                className={`mt-3 ${inputClass()}`}
              />
            </section>

            {/* --------------------------- Conditions + envoi -------------------------- */}
            <section className="space-y-3">
              <div>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-800">
                  <input
                    id="co-cgv"
                    type="checkbox"
                    checked={cgv}
                    onChange={(e) => {
                      setCgv(e.target.checked);
                      setErrors((x) => ({ ...x, cgv: undefined }));
                    }}
                    aria-invalid={!!errors.cgv}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
                  />
                  <span>
                    J'accepte{" "}
                    <Link to="/conditions-generales-de-vente" target="_blank" className="font-semibold underline">
                      les conditions générales de vente
                    </Link>
                  </span>
                </label>
                {errors.cgv && (
                  <p role="alert" className="mt-1 text-xs text-red-600">
                    {errors.cgv}
                  </p>
                )}
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={promo}
                  onChange={(e) => setPromo(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
                />
                <span>Je souhaite recevoir les promotions et ventes flash.</span>
              </label>

              {submitError && (
                <p role="alert" className="flex items-start gap-1.5 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {submitError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Link
                  to={editHref}
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-gray-100 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Retour
                </Link>
                <button
                  type="submit"
                  disabled={busy || expired}
                  className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 text-base font-bold text-brand-950 shadow-md transition hover:shadow-lg hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : method === "card" ? (
                    <Lock className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Send className="h-5 w-5" aria-hidden="true" />
                  )}
                  {method === "card" ? (
                    <span>
                      Je paye {amounts.deposit} <span className="text-xs font-extrabold">TND</span>
                    </span>
                  ) : (
                    "Envoyer ma demande de réservation"
                  )}
                </button>
              </div>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {method === "card"
                  ? "Paiement 100% sécurisé"
                  : "Sans engagement : votre réservation n'est confirmée qu'après l'appel de notre agence."}
              </p>
            </section>
          </div>

          <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
            <BookingSummary
              draft={draft}
              nights={nights}
              amounts={amounts}
              method={method}
              remainingMs={remainingMs}
              editHref={editHref}
            />
          </aside>
        </form>
      </div>
    </Layout>
  );
}
