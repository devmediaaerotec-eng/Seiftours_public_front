import axios from 'axios';

// Server-side proxy (api/mygo.ts): it adds the MyGo credentials, so they never ship to the browser
const API = '/api/mygo';
const DEV = import.meta.env.DEV;

export class MyGoError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'MyGoError';
    this.code = code;
  }
}

async function post<T>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
  if (DEV) console.log(`[MyGo] POST ${endpoint}`, JSON.stringify(body, null, 2));
  const { data } = await axios.post<unknown>(API, { endpoint, body });
  return check<T>(endpoint, data);
}

// Catalogue reads use GET so Vercel's CDN caches them for every visitor
async function get<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
  if (DEV) console.log(`[MyGo] GET ${endpoint}`, params);
  const { data } = await axios.get<unknown>(API, {
    params: { endpoint, ...params },
    paramsSerializer: {
      // Serialize arrays as CSV: ids=1,2,3 (backend-friendly)
      serialize: (p) =>
        new URLSearchParams(
          Object.entries(p).flatMap(([k, v]) =>
            Array.isArray(v) ? [[k, v.join(',')]] : [[k, String(v)]]
          )
        ).toString(),
    },
  });
  return check<T>(endpoint, data);
}

function check<T>(endpoint: string, raw: unknown): T {
  const data = typeof raw === 'string' ? JSON.parse(raw) : (raw as any);

  if (DEV) console.log(`[MyGo] RESPONSE ${endpoint}`, data);

  if (data == null) {
    throw new MyGoError(`Réponse vide pour ${endpoint}`, 500);
  }

  const code = Number(data?.ErrorMessage?.Code);
  if (code >= 400) {
    throw new MyGoError(data.ErrorMessage.Description ?? `Erreur API (${code})`, code);
  }

  return data as T;
}

import type { RoomConfig } from "./booking";
export type { RoomConfig };

export interface SearchParams {
  hotelIds?: number[];        // filter by specific hotels (optional)
  cityHotelIds?: number[];    // all hotel IDs for a city (passed from catalogue)
  checkIn: string;            // "YYYY-MM-DD"
  checkOut: string;           // "YYYY-MM-DD"
  rooms: RoomConfig[];
  onlyAvailable?: boolean;
  category?: number[];        // star filter
  tags?: string[];
  keywords?: string;
}

// ── Cache persistant (localStorage) ─────────────────────────────────────────
// - réutilise la réponse tant qu'elle est fraîche
// - un seul appel réseau si plusieurs composants demandent la même chose
// - si le quota (429) est dépassé : on mémorise le blocage et on n'appelle plus
//   l'API avant l'heure indiquée par MyGo (évite de gaspiller des appels)
// - en cas d'erreur, on retombe sur l'ancienne copie si elle existe

const inflight = new Map<string, Promise<any>>();
const DAY = 24 * 60 * 60 * 1000;

const blockKey = (key: string) => `${key}:blockedUntil`;

function getBlockedUntil(key: string): number {
  try {
    return Number(localStorage.getItem(blockKey(key)) || 0);
  } catch {
    return 0;
  }
}

function setBlock(key: string, message: string) {
  // Message MyGo : "... Retry after 2026-10-15 00:00:00."
  const m = /Retry after (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/.exec(message);
  let until = m ? new Date(`${m[1]}T${m[2]}`).getTime() : NaN;
  if (!Number.isFinite(until) || until <= Date.now()) until = Date.now() + 60 * 60 * 1000;
  try {
    localStorage.setItem(blockKey(key), String(until));
  } catch {
    /* ignore */
  }
}

function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  let stale: T | undefined;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const { t, v } = JSON.parse(raw);
      if (Date.now() - t < ttlMs) return Promise.resolve(v as T);
      stale = v as T; // périmé, mais utile en secours
    }
  } catch {
    /* ignore */
  }

  // Quota dépassé : on n'appelle pas l'API tant que le blocage n'est pas levé
  const blockedUntil = getBlockedUntil(key);
  if (blockedUntil > Date.now()) {
    if (stale !== undefined) return Promise.resolve(stale);
    return Promise.reject(
      new MyGoError(
        `Quota API dépassé. Nouvelle tentative possible après ${new Date(blockedUntil).toLocaleString('fr-FR')}.`,
        429
      )
    );
  }

  if (inflight.has(key)) return inflight.get(key)!;

  const p = fetcher()
    .then((v) => {
      try {
        localStorage.setItem(key, JSON.stringify({ t: Date.now(), v }));
        localStorage.removeItem(blockKey(key));
      } catch {
        /* localStorage plein : on ignore */
      }
      return v;
    })
    .catch((err) => {
      if (err instanceof MyGoError && err.code === 429) setBlock(key, err.message);
      if (stale !== undefined) return stale; // quota dépassé / API down → ancienne copie
      throw err;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

// ── Cache en mémoire (courte durée, perdu au rechargement) ──────────────────
// Pour les recherches de disponibilité : évite de refaire le même appel quand
// l'utilisateur revient en arrière ou relance la même recherche.

const memory = new Map<string, { t: number; v: Promise<any> }>();

function memo<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v as Promise<T>;

  const v = fetcher().catch((err) => {
    memory.delete(key); // on ne garde jamais une erreur
    throw err;
  });
  memory.set(key, { t: Date.now(), v });
  return v;
}

// ── API ─────────────────────────────────────────────────────────────────────

export const mygoApi = {
  listHotel: () => cached('mygo:ListHotel', DAY, () => get<any>('ListHotel')),


  hotelSearch: (params: SearchParams, opts: { fresh?: boolean } = {}) => {
    // Build Rooms array: each room is { Adult: n } or { Adult: n, Child: [ages] }
    const rooms = params.rooms.map((r) => {
      const room: Record<string, any> = { Adult: r.adults };
      if (r.children > 0 && r.childrenAges.length > 0) {
        room.Child = r.childrenAges;
      } else if (r.children > 0) {
        // No ages provided — send array of zeros as placeholder
        room.Child = Array(r.children).fill(0);
      }
      return room;
    });

    const run = () =>
      post<any>('HotelSearch', {
        SearchDetails: {
          BookingDetails: {
            CheckIn: params.checkIn,
            CheckOut: params.checkOut,
            // Send specific hotel IDs if provided, otherwise omit (searches all)
            ...(params.hotelIds?.length ? { Hotels: params.hotelIds } : {}),
          },
          Filters: {
            Keywords: params.keywords ?? '',
            Category: params.category ?? [],
            OnlyAvailable: params.onlyAvailable ?? false,
            Tags: params.tags ?? [],
          },
          Rooms: rooms,
        },
      });

    if (opts.fresh) return run();
    return memo(`search:${JSON.stringify({ ...params, rooms })}`, 3 * 60 * 1000, run);
  },

  // MyGo expects { Hotel: <id> } (sent by api/mygo.ts); { Hotel: { Id } } returns "System Error"
  hotelDetail: (hotelId: number) =>
    cached(`mygo:HotelDetail:${hotelId}`, DAY, () => get<any>('HotelDetail', { id: hotelId })),

  // Cancellation policies come with each room in the HotelSearch response
  // (the HotelCancellationPolicy endpoint always answers 400 "Rooms").

  bookingCreation: (params: Record<string, unknown>) => post<any>('BookingCreation', params),
};

// ── Response helpers ────────────────────────────────────────────────────────

/** Extract the list of hotels from HotelSearch response */
export function extractSearchHotels(data: any): any[] {
  const list = data?.HotelSearch ?? data?.HotelList ?? data?.Hotels ?? [];
  return Array.isArray(list) ? list : [];
}

/** Extract hotel ID from a HotelSearch entry */
export function extractHotelId(entry: any): number | null {
  const id = entry?.HotelId ?? entry?.Hotel?.Id ?? entry?.Id ?? null;
  return id !== null ? Number(id) : null;
}

/** Extract the lowest price per night from a HotelSearch entry */
export function extractLowestPrice(entry: any): number | null {
  // Confirmed API structure: entry.Price.BasePrice (string like "136.500")
  const basePrice = entry?.Price?.BasePrice;
  if (basePrice) {
    const parsed = parseFloat(basePrice);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Fallback: minimum across all Boarding → Pax → Rooms
  const boardings: any[] = entry?.Price?.Boarding ?? [];
  const prices = boardings
    .flatMap((b: any) => b?.Pax ?? [])
    .flatMap((p: any) => p?.Rooms ?? [])
    .map((r: any) => parseFloat(r?.Price ?? '0'))
    .filter((p) => p > 0);

  return prices.length > 0 ? Math.min(...prices) : null;
}