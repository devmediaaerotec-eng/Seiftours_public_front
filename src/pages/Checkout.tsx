import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CreditCard, Loader2, Lock, RefreshCw, Store } from "lucide-react";
import Layout from "@/components/Layout";
import CheckoutSteps from "@/components/CheckoutSteps";
import BookingSummary from "@/components/BookingSummary";
import { BranchOption } from "@/components/BranchCard";
import { BRANCHES, type BranchId } from "@/lib/branches";
import { bookingApi, BookingApiError, type GuestDetails, type GuestTitle } from "@/lib/Bookingapi";
import { amountsFor } from "@/lib/Payment";
import { diffDays, encodeRooms } from "@/lib/booking";
import { clearDraft, DRAFT_MAX_AGE_MS, loadDraft } from "@/lib/checkoutDraft";

type Method = "card" | "agency";
type Errors = Partial<Record<keyof GuestDetails | "cgv" | "branch", string>>;

const TITLES: GuestTitle[] = ["Mlle", "Mme", "M."];
const normalizePhone = (s: string) => s.replace(/[\s.\-()]/g, "").replace(/^00/, "+");

const inputClass = (error?: string) =>
  `w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-gray-900 transition placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-gray-300 focus:border-[#0A7C95] focus:ring-[#0A7C95]/20"
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
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition focus-within:ring-2 focus-within:ring-[#0A7C95]/30 ${
        selected ? "border-[#0A7C95] bg-[#E8F5F8]/60" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <input
        type="radio"
        name="payment-method"
        checked={selected}
        onChange={onSelect}
        className="h-4 w-4 shrink-0 accent-[#0A7C95]"
      />
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0A7C95] shadow-sm">
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
  const [method, setMethod] = useState<Method>("card");
  const [branchId, setBranchId] = useState<BranchId | null>(null); // agency option: Sousse or Jemmal
  const [cgv, setCgv] = useState(false);
  const [promo, setPromo] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
          <AlertCircle className="h-10 w-10 text-[#B45F00]" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Votre sélection a expiré</h1>
          <p className="mt-2 text-gray-600">Choisissez de nouveau un hôtel et une chambre pour continuer.</p>
          <Link
            to="/hotels-tunisie"
            className="mt-6 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 py-3 text-sm font-bold text-[#06303A] shadow-md"
          >
            Voir les hôtels
          </Link>
        </div>
      </Layout>
    );
  }

  const nights = Math.max(1, diffDays(draft.checkIn, draft.checkOut));
  const amounts = amountsFor(draft.total);
  const remainingMs = Math.max(0, draft.savedAt + DRAFT_MAX_AGE_MS - now);
  const expired = remainingMs === 0;
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
    if (method === "agency" && !branchId) e.branch = "Choisissez l'agence où vous souhaitez confirmer votre devis.";
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
        mode: method === "card" ? "deposit" : "agency",
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
        branchId: method === "agency" ? (branchId ?? undefined) : undefined,
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
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-[#E3A312]/40 bg-[#FFF6DD] p-4 text-sm text-[#7A5200]">
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
                  Paiement 100% sécurisé
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
                          className="h-4 w-4 accent-[#0A7C95]"
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

            {/* ------------------------------ Paiement ------------------------------ */}
            <section aria-labelledby="co-pay">
              <h2 id="co-pay" className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
                <CreditCard className="h-5 w-5 text-[#0A7C95]" aria-hidden="true" />
                Je paye avec
              </h2>

              <div className="mt-4 space-y-3">
                <PayOption
                  selected={method === "card"}
                  onSelect={() => setMethod("card")}
                  icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
                  title="Carte bancaire"
                  hint={`Acompte de ${amounts.deposit} TND en ligne, le reste à l'hôtel`}
                  badges={["CIB", "VISA", "MasterCard"]}
                />
                <PayOption
                  selected={method === "agency"}
                  onSelect={() => setMethod("agency")}
                  icon={<Store className="h-5 w-5" aria-hidden="true" />}
                  title="Je passe à l'agence"
                  hint="Choisissez Sousse ou Jemmal : nous enregistrons votre devis, vous le confirmez et réglez à l'agence"
                />
              </div>

              {method === "agency" && (
                <div className="mt-6" role="radiogroup" aria-labelledby="co-branch-title">
                  <h3 id="co-branch-title" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <Store className="h-5 w-5 text-[#0A7C95]" aria-hidden="true" />
                    Choisissez votre agence
                  </h3>
                  <div className="mt-3 space-y-3">
                    {BRANCHES.map((b, i) => (
                      <BranchOption
                        key={b.id}
                        id={i === 0 ? "co-branch" : undefined}
                        branch={b}
                        selected={branchId === b.id}
                        onSelect={() => {
                          setBranchId(b.id);
                          setErrors((x) => ({ ...x, branch: undefined }));
                        }}
                      />
                    ))}
                  </div>
                  {errors.branch && (
                    <p role="alert" className="mt-2 text-xs text-red-600">
                      {errors.branch}
                    </p>
                  )}
                </div>
              )}

              {method === "card" && (
                <p className="mt-3 text-sm text-gray-600">
                  Vous serez redirigé vers la page de paiement sécurisée ClicToPay. Vos données bancaires ne passent
                  jamais par notre site.
                </p>
              )}
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
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A7C95]"
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
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#0A7C95]"
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
                  className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-4 text-base font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Lock className="h-5 w-5" aria-hidden="true" />
                  )}
                  {method === "card" ? (
                    <span>
                      Je paye {amounts.deposit} <span className="text-xs font-extrabold">TND</span>
                    </span>
                  ) : (
                    "Envoyer ma demande"
                  )}
                </button>
              </div>
              <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Paiement 100% sécurisé
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
