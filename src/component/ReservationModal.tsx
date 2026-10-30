import { useEffect, useId, useState, type FormEvent } from "react";
import {
  X, User, Mail, Phone, Users, MessageSquare, CircleCheck, AlertCircle, Ban, MessageCircle, CalendarDays,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { AGENCY } from "@/lib/agency";
import { todayISO, type DateRange } from "@/lib/booking";
import DateRangePicker from "@/components/DateRangePicker";
import { Spinner } from "@/components/Loader";

export type ReservationType = "omra" | "transport" | "trip";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: ReservationType;
  itemId: string;
  itemName: string;
  price: number;
  currency?: string;
  departureDates?: string[];
  imageUrl?: string;
}

const INPUT =
  "w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#0A7C95] focus:outline-none focus:ring-2 focus:ring-[#0A7C95]/20";
const LABEL = "mb-1.5 block text-sm font-medium text-gray-700";
const ICON = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400";

const TYPE_LABELS: Record<ReservationType, string> = {
  omra: "Forfait Omra",
  transport: "Location de véhicule",
  trip: "Voyage organisé",
};

const EMPTY = { full_name: "", email: "", phone: "", passengers: "1", departure_date: "", message: "" };

type Availability = "checking" | "free" | "taken" | "unknown";

export default function ReservationModal({
  isOpen, onClose, type, itemId, itemName, price,
  currency = "TND", departureDates = [], imageUrl,
}: Props) {
  const uid = useId();
  const today = todayISO();
  const [form, setForm] = useState(EMPTY);
  const [period, setPeriod] = useState<DateRange>({});
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [formError, setFormError] = useState("");

  /* ── Availability (vehicles only), remembered per period ─────────────── */
  const periodKey = period.from && period.to ? `${period.from}|${period.to}` : "";
  const [checked, setChecked] = useState<{ key: string; result: Availability }>({ key: "", result: "unknown" });
  const availability: Availability | null =
    type !== "transport" || !periodKey ? null : checked.key === periodKey ? checked.result : "checking";

  useEffect(() => {
    if (type !== "transport" || !period.from || !period.to) return;
    const key = `${period.from}|${period.to}`;
    let alive = true;
    // Overlap: existing.start_date <= new.end_date AND existing.end_date >= new.start_date
    supabase
      .from("reservations")
      .select("id")
      .eq("item_id", itemId)
      .eq("status", "confirmed")
      .lte("start_date", period.to)
      .gte("end_date", period.from)
      .abortSignal(AbortSignal.timeout(8_000))
      .then(
        ({ data, error }) => {
          if (!alive) return;
          // A failed check must not block the visitor: the team confirms availability anyway
          setChecked({ key, result: error ? "unknown" : (data ?? []).length > 0 ? "taken" : "free" });
        },
        () => alive && setChecked({ key, result: "unknown" })
      );
    return () => {
      alive = false;
    };
  }, [period.from, period.to, itemId, type]);

  /* ── Dialog behaviour: Escape closes, page behind does not scroll ───── */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      // The calendar handles its own Escape first
      if (e.key === "Escape" && !document.querySelector("[role=dialog] [role=dialog]")) close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  });

  if (!isOpen) return null;

  const set = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value }));
      setFormError("");
    };

  const fmt = (iso?: string) =>
    iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00`)) : "";

  /** Same request as text, so it can go through WhatsApp when saving fails */
  const requestText = () =>
    [
      `Bonjour Seif Tours, je souhaite réserver : ${TYPE_LABELS[type]} « ${itemName} ».`,
      `Nom : ${form.full_name.trim()}`,
      `Téléphone : ${form.phone.trim()}`,
      form.email.trim() && `E-mail : ${form.email.trim()}`,
      type === "transport"
        ? `Période : du ${fmt(period.from)} au ${fmt(period.to)}`
        : form.departure_date && `Départ : ${form.departure_date}`,
      type !== "transport" && `Personnes : ${form.passengers}`,
      form.message.trim() && `Message : ${form.message.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

  const validate = () => {
    if (form.full_name.trim().length < 2) return "Veuillez indiquer votre nom complet.";
    if (form.phone.replace(/\D/g, "").length < 8) return "Veuillez indiquer un numéro de téléphone valide.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) return "Veuillez indiquer une adresse e-mail valide.";
    if (type === "transport" && (!period.from || !period.to)) return "Veuillez choisir la période de location.";
    if (type !== "transport" && departureDates.length > 0 && !form.departure_date)
      return "Veuillez choisir une date de départ.";
    return "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setFormError(problem);
    if (availability === "taken") return;
    setStatus("loading");

    const payload = {
      type,
      item_id: itemId,
      item_name: itemName,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      passengers: Number(form.passengers) || 1,
      departure_date: form.departure_date || null,
      start_date: period.from || null,
      end_date: period.to || null,
      message: form.message.trim() || null,
      status: "pending",
    };

    try {
      const { error } = await supabase.from("reservations").insert(payload).abortSignal(AbortSignal.timeout(15_000));
      setStatus(error ? "err" : "ok");
    } catch {
      setStatus("err");
    }
  };

  function close() {
    setStatus("idle");
    setForm(EMPTY);
    setPeriod({});
    setFormError("");
    onClose();
  }

  const titleId = `${uid}-title`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#031E26]/60 backdrop-blur-sm" onClick={close} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="page-enter relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        {/* Header with the offer */}
        <div className="relative shrink-0 bg-gradient-to-br from-[#064B5C] to-[#06303A] px-5 pb-5 pt-4 text-white sm:px-6">
          <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />
          <div className="flex items-start gap-4 pr-10">
            {imageUrl && (
              <img src={imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/20" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#F2B705]">{TYPE_LABELS[type]}</p>
              <h2 id={titleId} className="mt-0.5 line-clamp-2 text-lg font-extrabold leading-tight">
                {itemName}
              </h2>
              <p className="mt-1 text-sm text-white/75">
                À partir de <span className="font-bold text-[#FFC94D]">{price.toLocaleString("fr-FR")} {currency}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {status === "ok" ? (
            <div className="px-6 py-12 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
                <CircleCheck className="h-8 w-8 text-emerald-600" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-extrabold text-[#06303A]">Demande envoyée !</h3>
              <p className="mt-2 text-sm text-gray-600">
                Nous vous contactons sous 24 h au <span className="font-semibold text-gray-900">{form.phone}</span> pour
                confirmer votre réservation.
              </p>
              <button
                onClick={close}
                className="mt-6 rounded-xl bg-[#064B5C] px-8 py-3 font-bold text-white transition hover:bg-[#0A7C95]"
              >
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5 px-5 py-5 sm:px-6">
              {/* Contact details */}
              <fieldset className="space-y-3">
                <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Vos coordonnées</legend>
                <div>
                  <label htmlFor={`${uid}-name`} className={LABEL}>Nom complet *</label>
                  <div className="relative">
                    <User className={ICON} aria-hidden="true" />
                    <input
                      id={`${uid}-name`}
                      autoFocus
                      autoComplete="name"
                      value={form.full_name}
                      onChange={set("full_name")}
                      className={INPUT}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${uid}-phone`} className={LABEL}>Téléphone *</label>
                    <div className="relative">
                      <Phone className={ICON} aria-hidden="true" />
                      <input
                        id={`${uid}-phone`}
                        type="tel"
                        autoComplete="tel"
                        placeholder="+216 …"
                        value={form.phone}
                        onChange={set("phone")}
                        className={INPUT}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${uid}-email`} className={LABEL}>E-mail *</label>
                    <div className="relative">
                      <Mail className={ICON} aria-hidden="true" />
                      <input
                        id={`${uid}-email`}
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={set("email")}
                        className={INPUT}
                      />
                    </div>
                  </div>
                </div>
                {type !== "transport" && (
                  <div>
                    <label htmlFor={`${uid}-pax`} className={LABEL}>Nombre de personnes</label>
                    <div className="relative">
                      <Users className={ICON} aria-hidden="true" />
                      <input
                        id={`${uid}-pax`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="50"
                        value={form.passengers}
                        onChange={set("passengers")}
                        className={INPUT}
                      />
                    </div>
                  </div>
                )}
              </fieldset>

              {/* Dates */}
              <fieldset>
                <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                  {type === "transport" ? "Période de location" : "Date de départ"}
                </legend>

                {type === "transport" ? (
                  <>
                    <DateRangePicker
                      label="Du → au"
                      value={period}
                      onChange={(r) => {
                        setPeriod(r);
                        setFormError("");
                      }}
                      min={today}
                      minNights={0}
                      lang="FR"
                      compact
                    />
                    {availability === "checking" && (
                      <p className="mt-2 flex items-center gap-2 text-xs text-gray-500" role="status">
                        <Spinner size={14} /> Vérification de la disponibilité…
                      </p>
                    )}
                    {availability === "taken" && (
                      <div role="alert" className="mt-2 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-bold text-red-700">Véhicule déjà réservé</p>
                          <p className="text-xs text-red-600">Choisissez d'autres dates ou un autre véhicule.</p>
                        </div>
                      </div>
                    )}
                    {availability === "free" && (
                      <p className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
                        <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> Véhicule disponible pour ces dates
                      </p>
                    )}
                  </>
                ) : departureDates.length > 0 ? (
                  <div role="radiogroup" aria-label="Date de départ" className="flex flex-wrap gap-2">
                    {departureDates.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={form.departure_date === d}
                        onClick={() => {
                          setForm((p) => ({ ...p, departure_date: d }));
                          setFormError("");
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                          form.departure_date === d
                            ? "border-[#064B5C] bg-[#064B5C] text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-[#0A7C95] hover:text-[#0A7C95]"
                        }`}
                      >
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        {d}
                      </button>
                    ))}
                  </div>
                ) : (
                  <DateRangePicker
                    label="Date souhaitée"
                    value={{ from: form.departure_date || undefined }}
                    onChange={(r) => setForm((p) => ({ ...p, departure_date: r.from ?? "" }))}
                    min={today}
                    single
                    lang="FR"
                    compact
                  />
                )}
              </fieldset>

              {/* Message */}
              <div>
                <label htmlFor={`${uid}-msg`} className={LABEL}>Message (optionnel)</label>
                <div className="relative">
                  <MessageSquare className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                  <textarea
                    id={`${uid}-msg`}
                    rows={3}
                    placeholder="Demandes particulières, questions…"
                    value={form.message}
                    onChange={set("message")}
                    className={`${INPUT} resize-none`}
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {formError}
                </p>
              )}

              {/* Saving failed: nothing is lost, the same request goes through WhatsApp */}
              {status === "err" && (
                <div role="alert" className="rounded-xl border border-[#E3A312]/40 bg-[#FFF6DD] p-4">
                  <p className="flex items-start gap-2 text-sm font-semibold text-[#7A5200]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    Votre demande n'a pas pu être enregistrée. Envoyez-la directement sur WhatsApp, elle est déjà rédigée.
                  </p>
                  <a
                    href={`https://wa.me/${AGENCY.whatsapp}?text=${encodeURIComponent(requestText())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#06303A] py-2.5 text-sm font-bold text-white transition hover:bg-[#0A7C95]"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Envoyer sur WhatsApp
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading" || availability === "taken" || availability === "checking"}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] text-base font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading" ? (
                  <>
                    <Spinner size={18} /> Envoi en cours…
                  </>
                ) : availability === "taken" ? (
                  <>
                    <Ban className="h-4 w-4" aria-hidden="true" /> Dates non disponibles
                  </>
                ) : (
                  "Envoyer ma demande de réservation"
                )}
              </button>

              <p className="pb-1 text-center text-xs text-gray-500">
                Sans engagement : notre équipe vous contacte sous 24 h pour finaliser.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
