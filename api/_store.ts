import type { BookingStatus } from "../src/lib/Bookingapi";

export interface StoredBooking {
  reference: string;
  mode: "agency" | "deposit";
  status: BookingStatus;
  hotelId: number;
  hotelName: string;
  roomId: number;
  boardingId: number;
  roomName: string;
  boardingName: string;
  token: string; // MyGo offer token (needed later for BookingCreation)
  checkIn: string;
  checkOut: string;
  rooms: unknown[];
  amounts: { total: number; deposit: number; remaining: number; currency: string };
  client: { firstName: string; lastName: string; email: string; phone: string; title?: string };
  orderId?: string; // ClicToPay order id
  createdAt: number;
  paidAt?: number;
  syncing?: boolean;
}

/**
 * ⚠️ TEMPORARY STORAGE (in memory).
 * Good enough for `npm run dev` and for testing the whole flow.
 * On Vercel every invocation can run in a different instance, so before going live
 * replace this Map by a real database (Vercel Postgres / KV, Supabase, ...).
 * Only this file has to change: bookings.ts just uses get / set.
 */
const g = globalThis as unknown as { __bookingStore?: Map<string, StoredBooking> };
export const store: Map<string, StoredBooking> = (g.__bookingStore ??= new Map());
