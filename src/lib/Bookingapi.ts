import type { RoomConfig } from "@/lib/booking";
import type { Amounts, BookingMode } from "./Payment";

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
  /** Agency mode: the agency where the visitor will finalise the booking ("sousse" | "jemmal") */
  branchId?: string;
  /** What the visitor saw. The server re-checks it; it is never trusted. */
  displayedTotal: number;
}

export type BookingStatus =
  | "pending_agency" // agency option: request saved, the agency finalises it
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

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new BookingApiError(
      data?.error?.message ?? "Une erreur est survenue. Merci de réessayer.",
      data?.error?.code ?? "UNKNOWN",
      res.status
    );
  }
  return data as T;
}

export const bookingApi = {
  create: (payload: CreateBookingPayload) =>
    request<CreateBookingResult>("/bookings", { method: "POST", body: JSON.stringify(payload) }),

  // Query string (not /bookings/:ref): the dev API plugin in vite.config.ts only maps /api/<file>
  get: (reference: string) =>
    request<BookingView>(`/bookings?reference=${encodeURIComponent(reference)}`),
};
