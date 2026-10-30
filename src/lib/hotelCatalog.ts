import { mygoApi } from "@/lib/mygoApi";

/**
 * Shared, cached access to MyGo's ListHotel.
 *
 * MyGo limits ListHotel to 100 calls per day, so the whole site must share ONE call:
 *  - in-memory cache (shared by the Navbar and every page, survives route changes)
 *  - localStorage cache (survives reloads, Vite hot reload and React StrictMode double effects)
 *  - one in-flight request at a time (no duplicate calls when two components ask together)
 *  - after a "Too many requests" answer, no new call is made until the retry date
 *  - if the API fails, the last known catalogue is used instead of an empty page
 */

const CATALOG_KEY = "seiftours:mygo-hotels:v1";
const BLOCK_KEY = "seiftours:mygo-hotels-blocked-until:v1";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface CatalogResult {
  hotels: any[];
  /** true when the data did not come from a fresh API call */
  fromCache: boolean;
  /** true when the cache is older than the TTL (API was unavailable) */
  stale: boolean;
}

export class MyGoQuotaError extends Error {
  retryAfter?: string;
  constructor(message: string, retryAfter?: string) {
    super(message);
    this.name = "MyGoQuotaError";
    this.retryAfter = retryAfter;
  }
}

interface Stored {
  hotels: any[];
  fetchedAt: number;
}

console.info("[hotelCatalog] module loaded");

let memory: Stored | null = null;
let inflight: Promise<CatalogResult> | null = null;

/* ------------------------------ storage helpers ----------------------------- */
function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return Array.isArray(value?.hotels) && typeof value?.fetchedAt === "number" ? value : null;
  } catch {
    return null;
  }
}

function writeStored(value: Stored) {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(value));
  } catch {
    /* storage full or unavailable (private mode): the in-memory cache still works */
  }
}

function readBlockedUntil(): number {
  try {
    return Number(localStorage.getItem(BLOCK_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBlockedUntil(ts: number) {
  try {
    localStorage.setItem(BLOCK_KEY, String(ts));
  } catch {
    /* ignore */
  }
}

/** Keeps only what the site uses, so the cache stays small. */
function slim(h: any) {
  return {
    Id: h.Id,
    Name: h.Name,
    City: h.City ? { Id: h.City.Id, Name: h.City.Name } : undefined,
    Image: h.Image,
    Category: h.Category ? { Star: h.Category.Star } : undefined,
    Facilities: Array.isArray(h.Facilities)
      ? h.Facilities.slice(0, 3).map((f: any) => ({ Title: f?.Title }))
      : [],
    Theme: h.Theme,
  };
}

function describeApiError(e: unknown): string | null {
  if (!e) return null;
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const o = e as Record<string, unknown>;
    const text = o.Message ?? o.message ?? o.Description ?? o.Text ?? o.Error;
    if (typeof text === "string" && text.trim()) return text;
    try {
      return JSON.stringify(e);
    } catch {
      return null;
    }
  }
  return String(e);
}

// "quota" also catches mygoApi's own block message ("Quota API dépassé…")
const QUOTA_RE = /too many requests|limited to|retry after|quota/i;

function parseRetryAfter(message: string): { text?: string; ts?: number } {
  const match = message.match(/Retry after\s+(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/i);
  if (!match) return {};
  const text = `${match[1]} ${match[2]}`;
  const ts = new Date(`${match[1]}T${match[2]}`).getTime();
  return { text, ts: Number.isFinite(ts) ? ts : undefined };
}

/* ---------------------------------- public ---------------------------------- */
export async function getHotelCatalog(options: { force?: boolean } = {}): Promise<CatalogResult> {
  const now = Date.now();

  if (!options.force) {
    if (memory && now - memory.fetchedAt < TTL_MS) {
      console.info("[hotelCatalog] served from memory");
      return { hotels: memory.hotels, fromCache: true, stale: false };
    }
    const stored = readStored();
    if (stored && now - stored.fetchedAt < TTL_MS) {
      memory = stored;
      console.info(`[hotelCatalog] served from localStorage (${stored.hotels.length} hotels)`);
      return { hotels: stored.hotels, fromCache: true, stale: false };
    }
  }

  if (inflight) return inflight;

  inflight = (async (): Promise<CatalogResult> => {
    const fallback = () => {
      const old = memory ?? readStored();
      if (old) {
        memory = old;
        return { hotels: old.hotels, fromCache: true, stale: true } as CatalogResult;
      }
      return null;
    };

    try {
      // Quota already exhausted: do not call the API again before the retry date
      if (Date.now() < readBlockedUntil()) {
        console.warn(
          `[hotelCatalog] quota block active until ${new Date(readBlockedUntil()).toLocaleString()}, no API call made`
        );
        const old = fallback();
        if (old) return old;
        throw new MyGoQuotaError(
          "Quota MyGo atteint : aucun appel tant que la limite n'est pas levée.",
          new Date(readBlockedUntil()).toISOString()
        );
      }

      console.info("[hotelCatalog] calling ListHotel…");
      const response = await mygoApi.listHotel();

      if (!Array.isArray(response?.ListHotel)) {
        const message =
          describeApiError(response?.ErrorMessage) ?? "L'API MyGo n'a renvoyé aucun hôtel.";

        if ((response as any)?.ErrorMessage?.Code === 429 || QUOTA_RE.test(message)) {
          const { text, ts } = parseRetryAfter(message);
          // Default: wait one hour when the date cannot be read
          writeBlockedUntil(ts ?? Date.now() + 60 * 60 * 1000);
          throw new MyGoQuotaError(message, text);
        }
        throw new Error(message);
      }

      const stored: Stored = { hotels: response.ListHotel.map(slim), fetchedAt: Date.now() };
      memory = stored;
      writeStored(stored);
      console.info(`[hotelCatalog] ListHotel OK: ${stored.hotels.length} hotels cached`);
      return { hotels: stored.hotels, fromCache: false, stale: false };
    } catch (error) {
      console.warn("[hotelCatalog] ListHotel failed:", (error as any)?.message ?? error);
      const old = fallback();
      if (old) return old; // better an older catalogue than an empty page
      throw error;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** True if the error means "daily quota reached". */
export function isQuotaError(error: unknown): boolean {
  if (error instanceof MyGoQuotaError) return true;
  const message = (error as any)?.message;
  return typeof message === "string" && QUOTA_RE.test(message);
}

/** A message safe to show to visitors (no raw API text). */
export function friendlyApiError(error: unknown, fallback: string): string {
  if (isQuotaError(error)) {
    return "Notre service de réservation en ligne est très sollicité en ce moment. Merci de réessayer un peu plus tard ou de nous appeler.";
  }
  return (error as any)?.message ?? fallback;
}