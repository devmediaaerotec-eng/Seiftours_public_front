import { amountsFor } from "../src/lib/Payment"; // relative import: the "@" alias does not exist in api/
import { store, type StoredBooking } from "./_store";

/**
 * POST /api/bookings                 -> creates the booking (agency or online deposit)
 * GET  /api/bookings?reference=XXXX  -> status of a booking (checks the payment with ClicToPay when needed)
 *
 * Online payment = ClicToPay (SMT) REST gateway:
 *   register.do               -> returns { orderId, formUrl }: we redirect the visitor to formUrl
 *   getOrderStatusExtended.do -> orderStatus 2 = paid
 * ⚠️ Written from the usual ClicToPay/BPC integration guide: check names and values
 *    against the documentation your bank / SMT gave you.
 */

const json = (status: number, body: unknown) => Response.json(body, { status });
const fail = (status: number, code: string, message: string) =>
  json(status, { error: { code, message } });

const EMAIL = /^\S+@\S+\.\S+$/;
const PHONE = /^\+?\d{8,15}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const REFERENCE = /^[A-Z0-9]{6,20}$/;
const PAYMENT_SESSION_MS = 20 * 60 * 1000; // ClicToPay session length
const MAX_TOTAL = 200_000; // TND, sanity limit

const text = (v: unknown, max = 200) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const cleanPhone = (s: string) => s.replace(/[\s.\-()]/g, "").replace(/^00/, "+");

function newReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "TN" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/* ------------------------------- ClicToPay -------------------------------- */
function gateway() {
  const userName = process.env.CLICTOPAY_USER;
  const password = process.env.CLICTOPAY_PASSWORD;
  const publicUrl = (process.env.PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!userName || !password || !publicUrl) return null;
  return {
    base: (process.env.CLICTOPAY_API_URL ?? "https://test.clictopay.com/payment/rest").replace(/\/$/, ""),
    userName,
    password,
    publicUrl,
  };
}

async function gatewayCall(g: NonNullable<ReturnType<typeof gateway>>, method: string, params: Record<string, string>) {
  const res = await fetch(`${g.base}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ userName: g.userName, password: g.password, ...params }),
  });
  return (await res.json().catch(() => null)) as any;
}

/** Asks ClicToPay what happened to the order and updates our booking. */
async function syncPayment(b: StoredBooking) {
  const g = gateway();
  if (!g || !b.orderId || b.syncing) return;
  b.syncing = true;
  try {
    const s = await gatewayCall(g, "getOrderStatusExtended.do", { orderId: b.orderId, language: "fr" });
    if (!s || String(s.errorCode ?? "0") !== "0") return;

    const orderStatus = Number(s.orderStatus);
    if (orderStatus === 2) {
      // Paid: but only trust it if the amount is the one we asked for (millimes)
      if (Number(s.amount) !== b.amounts.deposit * 1000) {
        console.error(`[bookings] ${b.reference}: amount mismatch`, s.amount, b.amounts.deposit * 1000);
        return;
      }
      b.status = "paid";
      b.paidAt = Date.now();
      await confirmWithSupplier(b);
    } else if (orderStatus === 3 || orderStatus === 6) {
      b.status = "payment_failed"; // cancelled / declined
    } else if (Date.now() - b.createdAt > PAYMENT_SESSION_MS) {
      b.status = "expired"; // visitor never finished paying
    }
  } catch (e) {
    console.error(`[bookings] ${b.reference}: payment check failed`, e);
  } finally {
    b.syncing = false;
  }
}

/**
 * TODO: once the deposit is paid, book the room with MyGo (BookingCreation, using b.token).
 *   b.status = "confirming"; ... call MyGo ...; b.status = "confirmed" or "failed" (then refund the deposit).
 * Until this is written the booking stays "paid": the status page tells the visitor
 * that the team finalises the stay with the hotel.
 */
async function confirmWithSupplier(_b: StoredBooking) {}

/* --------------------------------- helpers -------------------------------- */
function validate(p: any): string | null {
  if (!p || typeof p !== "object") return "Requête invalide.";
  if (p.mode !== "agency" && p.mode !== "deposit") return "Mode de réservation invalide.";
  if (!Number.isInteger(p.hotelId) || p.hotelId <= 0) return "Hôtel invalide.";
  if (!text(p.hotelName) || !text(p.roomName) || !text(p.token, 4000)) return "Offre invalide. Actualisez les tarifs.";
  if (typeof p.boardingName !== "string" || !Number.isInteger(p.roomId) || !Number.isInteger(p.boardingId))
    return "Offre invalide. Actualisez les tarifs.";
  if (!ISO.test(p.checkIn ?? "") || !ISO.test(p.checkOut ?? "") || p.checkOut <= p.checkIn) return "Dates invalides.";
  if (!Array.isArray(p.rooms) || p.rooms.length < 1 || p.rooms.length > 5) return "Chambres invalides.";

  const c = p.client;
  if (!text(c?.firstName, 80) || !text(c?.lastName, 80)) return "Nom et prénom obligatoires.";
  if (!EMAIL.test(String(c?.email ?? "").trim())) return "Adresse e-mail invalide.";
  if (!PHONE.test(cleanPhone(String(c?.phone ?? "")))) return "Numéro de téléphone invalide.";

  const total = Number(p.displayedTotal);
  if (!Number.isFinite(total) || total <= 0 || total > MAX_TOTAL) return "Montant invalide.";
  return null;
}

const view = (b: StoredBooking) => ({
  reference: b.reference,
  status: b.status,
  mode: b.mode,
  hotelId: b.hotelId,
  hotelName: b.hotelName,
  roomName: b.roomName,
  boardingName: b.boardingName,
  checkIn: b.checkIn,
  checkOut: b.checkOut,
  amounts: b.amounts,
}); // never expose client data, token or orderId

/* ---------------------------------- routes -------------------------------- */
export async function POST(req: Request): Promise<Response> {
  let p: any;
  try {
    p = await req.json();
  } catch {
    return fail(400, "BAD_JSON", "Requête invalide.");
  }
  const problem = validate(p);
  if (problem) return fail(400, "INVALID_REQUEST", problem);

  // TODO (important before going live): re-check the price with MyGo (HotelSearch with p.token)
  // and use THAT total. displayedTotal is only what the visitor saw: never trust it.
  const amounts = amountsFor(Number(p.displayedTotal));

  const reference = newReference();
  const booking: StoredBooking = {
    reference,
    mode: p.mode,
    status: p.mode === "agency" ? "pending_agency" : "awaiting_payment",
    hotelId: p.hotelId,
    hotelName: p.hotelName.trim(),
    roomId: p.roomId,
    boardingId: p.boardingId,
    roomName: p.roomName.trim(),
    boardingName: p.boardingName.trim(),
    token: p.token,
    checkIn: p.checkIn,
    checkOut: p.checkOut,
    rooms: p.rooms,
    amounts,
    client: {
      firstName: p.client.firstName.trim(),
      lastName: p.client.lastName.trim(),
      email: p.client.email.trim(),
      phone: cleanPhone(p.client.phone),
      title: typeof p.client.title === "string" ? p.client.title : undefined,
    },
    createdAt: Date.now(),
  };

  if (p.mode === "agency") {
    store.set(reference, booking);
    return json(201, view(booking));
  }

  // Online deposit: ask ClicToPay for a payment page
  const g = gateway();
  if (!g)
    return fail(
      500,
      "PAYMENT_NOT_CONFIGURED",
      "Le paiement en ligne n'est pas encore disponible. Choisissez « Payer à l'agence »."
    );

  const back = `${g.publicUrl}/reservation/${reference}`;
  const data = await gatewayCall(g, "register.do", {
    orderNumber: reference,
    amount: String(amounts.deposit * 1000), // millimes
    currency: "788", // TND
    returnUrl: back,
    failUrl: back, // the status page asks ClicToPay what really happened
    language: "fr",
    description: `Acompte ${reference} - ${booking.hotelName}`.slice(0, 200),
  }).catch(() => null);

  if (!data?.formUrl || !data?.orderId) {
    console.error("[bookings] register.do failed:", data?.errorCode, data?.errorMessage);
    return fail(502, "PAYMENT_INIT_FAILED", "Impossible de démarrer le paiement. Réessayez dans un instant.");
  }

  booking.orderId = String(data.orderId);
  store.set(reference, booking);
  return json(201, { ...view(booking), paymentUrl: String(data.formUrl) });
}

export async function GET(req: Request): Promise<Response> {
  const reference = (new URL(req.url).searchParams.get("reference") ?? "").toUpperCase();
  const booking = REFERENCE.test(reference) ? store.get(reference) : undefined;
  if (!booking) return fail(404, "NOT_FOUND", "Réservation introuvable.");

  if (booking.status === "awaiting_payment") await syncPayment(booking);
  return json(200, view(booking));
}
