import type { RoomConfig } from "./booking";
import type { CancellationSummary } from "./Payment";

/**
 * What the visitor selected on the hotel page (step 1), handed to the checkout page (step 2).
 * Kept in sessionStorage so a page refresh on /checkout does not lose the selection.
 */
export interface CheckoutDraft {
  hotelId: number;
  hotelName: string;
  stars?: number; // 1..5
  city?: string;
  imageUrl?: string;
  rating?: number; // e.g. 4.0 (out of 5)

  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  rooms: RoomConfig[];

  token: string; // MyGo offer token
  roomId: number;
  boardingId: number;
  roomName: string;
  boardingName: string;

  total: number; // TND, what the visitor saw
  oldTotal?: number; // price before promotion
  touristTax?: number; // TND, paid at the hotel
  cancellation: CancellationSummary | null;

  savedAt: number; // ms: used for the "price valid for 10 minutes" rule
}

/** MyGo offer tokens expire quickly: same 10 minutes as the "stale prices" banner. */
export const DRAFT_MAX_AGE_MS = 10 * 60 * 1000;

const KEY = "checkoutDraft.v1";

export function saveDraft(
  draft: Omit<CheckoutDraft, "savedAt"> & { savedAt?: number }
) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        ...draft,
        savedAt: draft.savedAt ?? Date.now(),
      })
    );
  } catch {
    /* private mode / storage full: the checkout page will ask to start again */
  }
}

export function loadDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as CheckoutDraft;
    return d && d.hotelId && d.token && d.total > 0 && Array.isArray(d.rooms) ? d : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
