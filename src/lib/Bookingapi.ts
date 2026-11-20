import type { RoomConfig } from "./booking";
import type { Amounts, BookingMode, PricingConfig } from "./Payment";

const BASE: string = (import.meta as any).env?.VITE_BOOKING_API ?? "/api";

export type GuestTitle = "Mlle" | "Mme" | "M.";

export interface GuestDetails {
  title?: GuestTitle;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface CreateBookingPayload {
  mode: BookingMode;
  hotelId: number;
  hotelName: string;
  token: string; // MyGo offer token from the search
  roomId: number;
  boardingId: number;
  roomName: string;
  boardingName: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  rooms: RoomConfig[];
  client: GuestDetails;
  /** Optional: the agency where the visitor would like to pay ("sousse" | "jemmal") */
  branchId?: string;
  /** Optional remarks for the agency (max 2000 characters) */
  notes?: string;
  /** What the visitor saw. The server re-checks it with MyGo; it is never trusted. */
  displayedTotal: number;
}

export type BookingStatus =
  | "pending_confirmation" // reservation request saved: the agency checks availability and calls back
  | "contacted" // the agency has called the visitor
  | "rejected" // the request could not be satisfied (hotel full…)
  | "pending_agency" // legacy agency quote
  | "awaiting_payment" // deposit option: waiting for the payment provider
  | "paid" // deposit received, booking with the supplier not done yet
  | "confirming" // supplier booking in progress
  | "confirmed" // done
  | "payment_failed" // the visitor did not pay
  | "failed" // paid but the supplier refused: refund
  | "cancelled"
  | "expired";

export interface CreateBookingResult {
  reference: string;
  status: BookingStatus;
  mode: BookingMode;
  amounts: Amounts;
  /** Deposit mode: redirect the visitor here to pay */
  paymentUrl?: string;
}

export interface BookingView {
  reference: string;
  status: BookingStatus;
  mode: BookingMode;
  hotelId: number;
  hotelName: string;
  roomName: string;
  boardingName: string;
  checkIn: string;
  checkOut: string;
  amounts: Amounts;
  /** Agency mode: chosen agency */
  branchId?: string;
  message?: string;
}

export class BookingApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "BookingApiError";
    this.code = code;
    this.status = status;
  }
}

interface ApiErrorResponse {
  error?: {
    message?: string;
    code?: string;
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new BookingApiError(
      "Connexion impossible. Vérifiez votre connexion internet et réessayez.",
      "NETWORK",
      0
    );
  }

const data = (await res.json().catch(() => null)) as ApiErrorResponse | null;
  if (!res.ok) {
    throw new BookingApiError(
      data?.error?.message ?? "Une erreur est survenue. Merci de réessayer.",
      data?.error?.code ?? "UNKNOWN",
      res.status
    );
  }
  return data as T;
}

// Bookings are stored by the Symfony API (proxied by Vite in dev, by vercel.json in production)
export const bookingApi = {
  create: (payload: CreateBookingPayload) =>
    request<CreateBookingResult>("/public/bookings", { method: "POST", body: JSON.stringify(payload) }),
  get: (reference: string) =>
    request<BookingView>(`/public/bookings/${encodeURIComponent(reference)}`),
  /** Markup and deposit rules (hotelId omitted = general rule, for hotel lists) */
  config: (hotelId?: number, checkIn?: string) => {
    const qs = new URLSearchParams();
    if (hotelId) qs.set("hotel", String(hotelId));
    if (checkIn) qs.set("checkIn", checkIn);
    const q = qs.toString();
    return request<PricingConfig>(`/public/booking-config${q ? `?${q}` : ""}`);
  },
};
