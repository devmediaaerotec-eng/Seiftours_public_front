import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import CheckoutSteps from "@/components/CheckoutSteps";
import { BranchInfo } from "@/components/BranchCard";
import { AGENCY } from "@/lib/agency";
import { getBranch } from "@/lib/branches";
import { bookingApi, BookingApiError, type BookingView } from "@/lib/Bookingapi";

import { fromISO, isISO } from "@/lib/booking";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  HelpCircle,
  Info,
  Loader2,
  Mail,
  Phone,
  XCircle,
} from "lucide-react";

const POLL_EVERY_MS = 3000;
const POLL_MAX_MS = 2 * 60 * 1000;

const money = (n: number, currency = "TND") =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${currency}`;
const day = (iso: string) =>
  isISO(iso)
    ? new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(fromISO(iso))
    : iso;

const WORKING = new Set(["awaiting_payment", "paid", "confirming"]);
const DONE = new Set(["confirmed", "pending_agency", "paid"]);
 
export default function BookingStatus() {
  const { reference = "" } = useParams<{ reference: string }>();
  // Sent by the checkout page (never stored on the server): lets us greet the visitor by name
  const { state } = useLocation() as { state: { firstName?: string; email?: string } | null };
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    startedAt.current = Date.now();

    const poll = async () => {
      try {
        const view = await bookingApi.get(reference);
        if (cancelled) return;
        setBooking(view);
        setError(null);

        if (WORKING.has(view.status)) {
          if (Date.now() - startedAt.current > POLL_MAX_MS) {
            setTimedOut(true);
            return;
          }
          timer = setTimeout(poll, POLL_EVERY_MS);
        }
      } catch (e) {
        if (cancelled) return;
        const notFound = e instanceof BookingApiError && e.status === 404;
        setError(notFound ? "Cette réservation est introuvable." : (e as Error).message);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reference]);

  const phone = AGENCY.phones[0];

  /* ------------------------- recap card (used by both layouts) ------------------------- */
  const summaryCard = booking && (
    <div className="w-full rounded-2xl border border-[#0A7C95]/20 bg-[#E8F5F8] px-6 py-5 text-left">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#064B5C]">Référence</p>
      <p className="mt-1 text-center text-2xl font-extrabold tracking-wide text-[#0A7C95]">{booking.reference}</p>

      <dl className="mt-4 space-y-2 border-t border-[#0A7C95]/15 pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Hôtel</dt>
          <dd className="text-right font-semibold text-gray-900">{booking.hotelName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Séjour</dt>
          <dd className="text-right font-semibold text-gray-900">
            {day(booking.checkIn)} → {day(booking.checkOut)}
          </dd>
        </div>
        {booking.roomName && (
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Chambre</dt>
            <dd className="text-right text-gray-900">
              {booking.roomName}
              {booking.boardingName ? ` · ${booking.boardingName}` : ""}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-[#0A7C95]/15 pt-2">
          <dt className="text-gray-500">Total du séjour</dt>
          <dd className="font-bold text-gray-900">{money(booking.amounts.total, booking.amounts.currency)}</dd>
        </div>
        {booking.mode === "agency" && (
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">À régler à l'agence</dt>
            <dd className="font-semibold text-[#0A7C95]">{money(booking.amounts.total, booking.amounts.currency)}</dd>
          </div>
        )}
        {booking.mode === "deposit" && (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Acompte en ligne</dt>
              <dd className="font-semibold text-[#0A7C95]">{money(booking.amounts.deposit, booking.amounts.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Reste à régler à l'hôtel</dt>
              <dd className="font-semibold text-gray-900">{money(booking.amounts.remaining, booking.amounts.currency)}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );

  /* ------------------------------ agency quote saved ------------------------------ */
  if (booking?.status === "pending_agency") {
    const branch = getBranch(booking.branchId);
    return (
      <Layout>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <CheckoutSteps current={4} />

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-emerald-700" role="status">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                Devis sauvegardé
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Réf. n° <span className="font-bold text-gray-900">{booking.reference}</span>
              </p>

              <h1 className="mt-6 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                Merci{state?.firstName ? ` ${state.firstName}` : ""} !
              </h1>
              <p className="mt-2 text-xl font-bold leading-snug text-gray-900 sm:text-2xl">
                {branch
                  ? `RDV à l'${branch.name.replace(/^Agence/, "agence")} pour confirmer votre devis.`
                  : "Notre équipe vous contacte pour confirmer votre devis."}
              </p>

              {branch && (
                <div className="mt-6 rounded-3xl border border-gray-200/70 bg-white p-5 shadow-sm sm:p-6">
                  <BranchInfo branch={branch} />
                </div>
              )}

              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                {state?.email && (
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
                    <span>
                      Un conseiller vous contactera à : <span className="font-semibold">{state.email}</span>
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
                  <span>
                    Les prix et les disponibilités changent en temps réel : ils peuvent subir des modifications au
                    moment de la confirmation.
                  </span>
                </li>
              </ul>

              <Link
                to="/hotels-tunisie"
                className="mt-8 inline-flex items-center gap-1.5 rounded-xl px-1 py-2 text-sm font-semibold text-gray-600 transition hover:text-[#0A7C95]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Retour aux hôtels
              </Link>
            </div>

            <aside className="space-y-6">
              {summaryCard}
              <div className="rounded-2xl border border-emerald-600/60 bg-white p-5">
                <h2 className="text-lg font-bold text-gray-900">Besoin d'aide ?</h2>
                <a href={phone.href} className="mt-3 flex items-center gap-2 font-semibold text-[#0A7C95] hover:underline">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {phone.display}
                </a>
                <p className="mt-2 flex items-start gap-2 text-sm text-gray-600">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  Notre équipe est là pour vous aider.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </Layout>
    );
  }

  /* ------------------------------ other statuses ------------------------------ */
  let icon = <Loader2 className="h-9 w-9 animate-spin text-[#0A7C95]" aria-hidden="true" />;
  let ring = "bg-[#E8F5F8]";
  let title = "Validation en cours…";
  let text = "Nous vérifions votre paiement et finalisons votre réservation. Merci de ne pas fermer cette page.";

  if (error && !booking) {
    icon = <AlertCircle className="h-9 w-9 text-red-500" aria-hidden="true" />;
    ring = "bg-red-50";
    title = "Réservation introuvable";
    text = error;
  } else if (booking) {
    switch (booking.status) {
      case "confirmed":
        icon = <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />;
        ring = "bg-emerald-50";
        title = "Réservation confirmée !";
        text = "Conservez votre référence : elle vous sera demandée à l'hôtel et par notre équipe.";
        break;
      case "paid":
        icon = <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />;
        ring = "bg-emerald-50";
        title = "Paiement reçu";
        text = "Merci ! Notre équipe finalise votre séjour avec l'hôtel et vous contacte pour confirmer. Conservez votre référence.";
        break;
      case "payment_failed":
        icon = <XCircle className="h-9 w-9 text-red-500" aria-hidden="true" />;
        ring = "bg-red-50";
        title = "Paiement non abouti";
        text = "Aucun montant n'a été débité. Vous pouvez recommencer ou choisir de passer à l'agence.";
        break;
      case "failed":
        icon = <AlertCircle className="h-9 w-9 text-[#B45F00]" aria-hidden="true" />;
        ring = "bg-[#FFF6DD]";
        title = "Réservation impossible";
        text = "L'hôtel n'a pas pu confirmer ce séjour. Votre acompte sera remboursé : notre équipe vous contacte.";
        break;
      case "cancelled":
      case "expired":
        icon = <XCircle className="h-9 w-9 text-gray-500" aria-hidden="true" />;
        ring = "bg-gray-100";
        title = booking.status === "expired" ? "Demande expirée" : "Réservation annulée";
        text = "Contactez-nous si vous souhaitez reprendre cette réservation.";
        break;
      default:
        if (timedOut) {
          icon = <Clock className="h-9 w-9 text-[#B45F00]" aria-hidden="true" />;
          ring = "bg-[#FFF6DD]";
          title = "La validation prend plus de temps";
          text = "Votre paiement n'est pas perdu. Gardez votre référence et contactez-nous si vous ne recevez pas de confirmation.";
        }
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <CheckoutSteps current={booking && DONE.has(booking.status) ? 4 : 3} />
      </div>

      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center px-4 py-12 text-center">
        <span className={`flex h-20 w-20 items-center justify-center rounded-full ring-8 ring-white ${ring}`}>{icon}</span>

        <h1 className="mt-6 text-2xl font-extrabold text-gray-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-gray-600" role="status" aria-live="polite">
          {text}
        </p>

        {summaryCard && <div className="mt-6 w-full">{summaryCard}</div>}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {booking && (booking.status === "payment_failed" || booking.status === "expired") && (
            <Link
              to={`/hotels/${booking.hotelId}?checkIn=${booking.checkIn}&checkOut=${booking.checkOut}`}
              className="rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 py-3 text-sm font-bold text-[#06303A] shadow-md transition hover:brightness-105"
            >
              Recommencer
            </Link>
          )}
          <a
            href={phone.href}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#0A7C95] px-5 py-3 text-sm font-bold text-[#0A7C95] transition hover:bg-[#E8F5F8]"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {phone.display}
          </a>
          <Link
            to="/hotels-tunisie"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition hover:text-[#0A7C95]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Retour aux hôtels
          </Link>
        </div>
      </div>
    </Layout>
  );
}
