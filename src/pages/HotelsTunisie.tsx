import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import HotelCard, { HotelCardSkeleton } from "@/components/HotelCard";
import type { Hotel } from "@/components/HotelCard";
import RoomComposer, { roomSummary } from "@/components/RoomComposer";
import DateRangePicker from "@/components/DateRangePicker";
import DestinationPicker from "@/components/DestinationPicker";
import {
  ArrowUpDown,
  Loader2,
  AlertCircle,
  Search,
  Star,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { mygoApi, extractSearchHotels, extractHotelId, extractLowestPrice } from "@/lib/mygoApi";
import { getHotelCatalog, friendlyApiError } from "@/lib/hotelCatalog";

import {
  addDays,
  decodeRooms,
  diffDays,
  encodeRooms,
  fromISO,
  isISO,
  todayISO,
  type RoomConfig,
} from "@/lib/booking";

/* -------------------------------------------------------------------------- */
/*  Settings                                                                  */
/* -------------------------------------------------------------------------- */

// Replace with one of your own photos (e.g. "/images/hotels-hero.jpg")
const BANNER_IMAGE =
  "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhre3qyaaflq/hero-mediterranean-coast.png";

const FALLBACK_HOTEL_IMAGE =
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80";

// The home search does not collect children's ages, so we assume this one.
// The visitor can change it in the room selector.
const DEFAULT_CHILD_AGE = 8;
const PAGE_SIZE = 12; // divisible by 2, 3 and 4 columns

const DEFAULT_ROOMS: RoomConfig[] = [{ adults: 2, children: 0, childrenAges: [] }];

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3";

/* -------------------------------------------------------------------------- */
/*  Types & helpers                                                           */
/* -------------------------------------------------------------------------- */
interface City {
  Id: number;
  Name: string;
}

interface SearchForm {
  cityId: number | null;
  cityName: string;
  checkIn: string;
  checkOut: string;
  rooms: RoomConfig[];
}

interface Scope {
  cityId: number | null;
  cityName: string;
  query: string;
}

interface LastSearch {
  checkIn: string;
  checkOut: string;
  rooms: RoomConfig[];
}

type SortKey = "recommended" | "price-asc" | "price-desc" | "stars";

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(fromISO(iso));

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const hasPrice = (h: Hotel) => h.price != null && (h.price as number) > 0;

/** Spreads the totals coming from the home search over the requested number of rooms. */
function buildRooms(roomCount: number, adults: number, children: number): RoomConfig[] {
  const r = Math.max(1, Math.min(roomCount || 1, adults || 1));
  const a = Math.max(adults || 2, r);
  return Array.from({ length: r }, (_, i) => {
    const ad = Math.floor(a / r) + (i < a % r ? 1 : 0);
    const ch = Math.floor(children / r) + (i < children % r ? 1 : 0);
    return {
      adults: ad,
      children: ch,
      childrenAges: Array.from({ length: ch }, () => DEFAULT_CHILD_AGE),
    };
  });
}

/** Turns a free-text destination ("Hammamet", "yasmine hammamet"…) into a city when possible. */
function resolveDestination(dest: string, hotels: Hotel[], cities: City[]): Scope {
  const n = normalize(dest);
  if (!n) return { cityId: null, cityName: "", query: "" };

  const names = Array.from(
    new Set([...cities.map((c) => c.Name), ...hotels.map((h) => h.location)].filter(Boolean))
  ) as string[];

  const exact = names.find((x) => normalize(x) === n);
  const userIsLonger = names
    .filter((x) => n.includes(normalize(x)))
    .sort((a, b) => b.length - a.length)[0];
  const cityIsLonger = names.find((x) => normalize(x).includes(n));
  const match = exact ?? userIsLonger ?? cityIsLonger;

  if (match) {
    const city = cities.find((c) => c.Name === match);
    const hotel = hotels.find((h) => h.location === match);
    return { cityId: city?.Id ?? hotel?.cityId ?? null, cityName: match, query: "" };
  }
  return { cityId: null, cityName: "", query: dest.trim() };
}

const inScope = (h: Hotel, s: Scope) => {
  if (s.cityId != null) return h.cityId === s.cityId;
  if (s.cityName) return h.location === s.cityName;
  if (s.query) {
    const q = normalize(s.query);
    return normalize(h.name).includes(q) || normalize(h.location ?? "").includes(q);
  }
  return true;
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function HotelsTunisie() {
  const [urlParams, setUrlParams] = useSearchParams();
  const paramsKey = urlParams.toString();
  const today = useMemo(() => todayISO(), []);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);

  const [form, setForm] = useState<SearchForm>({
    cityId: null,
    cityName: "",
    checkIn: addDays(today, 1),
    checkOut: addDays(today, 4),
    rooms: DEFAULT_ROOMS,
  });

  const [activeCity, setActiveCity] = useState("Tous");
  const [textQuery, setTextQuery] = useState("");
  const [minStars, setMinStars] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [lastSearch, setLastSearch] = useState<LastSearch | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);

  // Refs so async callbacks always read the latest data
  const hotelsRef = useRef<Hotel[]>([]);
  const formRef = useRef(form);
  const appliedKey = useRef<string | null>(null);
  hotelsRef.current = hotels;
  formRef.current = form;

  /* ----------------------------- Catalogue load ---------------------------- */
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // One shared, cached call (MyGo allows only 100 ListHotel calls per day)
      const { hotels: hotelList } = await getHotelCatalog();

      setHotels(
        hotelList.map((h: any) => ({
          id: String(h.Id),
          cityId: h.City?.Id,
          name: h.Name ?? "Hôtel",
          location: h.City?.Name ?? "Tunisie",
          image: h.Image || FALLBACK_HOTEL_IMAGE,
          price: null,
          stars: h.Category?.Star ?? 3,
          badge: Array.isArray(h.Theme) && h.Theme.includes("Promo") ? "Promo" : undefined,
        }))
      );

      // Cities come from the hotels themselves (the ListCity endpoint returns 404)
      const cityMap = new Map<number, City>();
      for (const h of hotelList) {
        if (h.City?.Id != null && h.City?.Name) {
          cityMap.set(h.City.Id, { Id: h.City.Id, Name: h.City.Name });
        }
      }
      setCities(Array.from(cityMap.values()).sort((a, b) => a.Name.localeCompare(b.Name, "fr")));

      setCatalogReady(true);
    } catch (err) {
      console.error("[MyGo] Catalogue indisponible :", err);
      setError(friendlyApiError(err, "Erreur de connexion à l'API."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  /* ------------------------------ Availability ----------------------------- */
  const runSearch = useCallback(
    async (args: { checkIn: string; checkOut: string; rooms: RoomConfig[]; scope: Scope }) => {
      const { checkIn, checkOut, rooms, scope } = args;
      setSearchError(null);
      setSearchNotice(null);
      setSearchLoading(true);
      setLastSearch({ checkIn, checkOut, rooms });

      try {
        const ids = hotelsRef.current
          .filter((h) => inScope(h, scope))
          .map((h) => parseInt(h.id!, 10))
          .filter((n) => Number.isFinite(n));

        if (ids.length === 0) {
          throw new Error("Aucun hôtel à interroger pour cette destination.");
        }

        const searchData = await mygoApi.hotelSearch({ hotelIds: ids, checkIn, checkOut, rooms });
        const results = extractSearchHotels(searchData);

        const priceMap = new Map<number, number>();
        for (const entry of results) {
          const id = extractHotelId(entry);
          const price = extractLowestPrice(entry);
          if (id !== null && price !== null) priceMap.set(id, price);
        }

        if (priceMap.size === 0) {
          // Nothing bookable for these dates: keep the hotels visible instead of an empty page
          setOnlyAvailable(false);
          setSearchNotice(
            "Aucune disponibilité confirmée pour ces dates. Voici tous nos hôtels : essayez d'autres dates ou appelez-nous."
          );
        } else {
          setOnlyAvailable(true);
        }

        const idSet = new Set(ids);
        // Hotels that were searched but returned no price are unavailable for these dates
        setHotels((prev) =>
          prev.map((h) => {
            const id = parseInt(h.id!, 10);
            return idSet.has(id) ? { ...h, price: priceMap.get(id) ?? null } : h;
          })
        );
      } catch (err: any) {
        setSearchError(friendlyApiError(err, "Erreur lors de la recherche."));
        setLastSearch(null);
        setOnlyAvailable(true);
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  /* ------------- Apply the URL (home search / navbar links) --------------- */
  // Runs once the catalogue is loaded, and again whenever the URL parameters change.
  useEffect(() => {
    if (!catalogReady) return;
    if (appliedKey.current === paramsKey) return;
    appliedKey.current = paramsKey;

    const p = new URLSearchParams(paramsKey);
    const cityIdParam = p.get("cityId");

    let scope: Scope = { cityId: null, cityName: "", query: "" };
    if (cityIdParam) {
      const city = cities.find((c) => String(c.Id) === cityIdParam);
      const hotel = hotelsRef.current.find((h) => String(h.cityId) === cityIdParam);
      scope = {
        cityId: Number(cityIdParam),
        cityName: city?.Name ?? hotel?.location ?? "",
        query: "",
      };
    } else if (p.get("destination")) {
      scope = resolveDestination(p.get("destination")!, hotelsRef.current, cities);
    }

    const ci = p.get("checkIn");
    const co = p.get("checkOut");
    const datesValid = isISO(ci) && isISO(co) && co > ci;

    // "guests" carries every room with children ages (own search); the home search only sends totals
    const exactRooms = decodeRooms(p.get("guests"));
    const hasGuests = !!exactRooms || p.has("adults") || p.has("rooms") || p.has("children");
    const rooms =
      exactRooms ??
      (hasGuests
        ? buildRooms(
            Number(p.get("rooms")) || 1,
            Number(p.get("adults")) || 2,
            Number(p.get("children")) || 0
          )
        : formRef.current.rooms);

    setForm((prev) => ({
      ...prev,
      cityId: scope.cityId,
      cityName: scope.cityName,
      ...(datesValid ? { checkIn: ci!, checkOut: co! } : {}),
      ...(hasGuests ? { rooms } : {}),
    }));
    setActiveCity(scope.cityName || "Tous");
    setTextQuery(scope.query);

    if (datesValid) {
      runSearch({ checkIn: ci!, checkOut: co!, rooms, scope });
    }
  }, [catalogReady, paramsKey, cities, runSearch]);

  /* ------------------------------ Manual search ---------------------------- */
  const handleSearch = () => {
    if (!form.checkIn || !form.checkOut) {
      setSearchError("Veuillez sélectionner les dates d'arrivée et de départ.");
      return;
    }
    if (form.checkOut <= form.checkIn) {
      setSearchError("La date de départ doit être après la date d'arrivée.");
      return;
    }

    const scope: Scope = { cityId: form.cityId, cityName: form.cityName, query: "" };
    setTextQuery("");

    // Keep the URL in sync so the result can be shared and the back button works
    const p = new URLSearchParams();
    if (form.cityName) p.set("destination", form.cityName);
    p.set("checkIn", form.checkIn);
    p.set("checkOut", form.checkOut);
    p.set("guests", encodeRooms(form.rooms));
    appliedKey.current = p.toString(); // already applied: do not search twice
    setUrlParams(p);

    runSearch({ checkIn: form.checkIn, checkOut: form.checkOut, rooms: form.rooms, scope });
  };

  /* ------------------------------ Destination ------------------------------ */
  // Every destination with its total number of hotels, A to Z
  const destinationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hotels) {
      if (h.location) counts.set(h.location, (counts.get(h.location) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
      a.name.localeCompare(b.name, "fr")
    );
  }, [hotels]);

  const selectCity = (name: string) => {
    const cityObj = cities.find((c) => c.Name === name);
    const hotelWithCity = hotels.find((h) => h.location === name);
    setForm((f) => ({
      ...f,
      cityId: name ? (cityObj?.Id ?? hotelWithCity?.cityId ?? null) : null,
      cityName: name,
    }));
    setActiveCity(name || "Tous");
    setTextQuery("");
  };

  /* ------------------------------ Derived values --------------------------- */
  const searched = lastSearch !== null;

  // Does the URL ask for a search that has not produced a result (or an error) yet?
  const urlHasDates = useMemo(() => {
    const p = new URLSearchParams(paramsKey);
    const ci = p.get("checkIn");
    const co = p.get("checkOut");
    return isISO(ci) && isISO(co) && co > ci;
  }, [paramsKey]);

  // While prices are being fetched, never say "no hotel": show placeholders instead
  const isPending = !loading && !error && (searchLoading || (urlHasDates && !searched && !searchError));

  const visibleHotels = useMemo(() => {
    let list = hotels.filter((h) => {
      if (activeCity !== "Tous" && h.location !== activeCity) return false;
      if (textQuery && !inScope(h, { cityId: null, cityName: "", query: textQuery })) return false;
      return true;
    });

    if (minStars) list = list.filter((h) => (h.stars ?? 0) >= minStars);
    if (searched && onlyAvailable) list = list.filter(hasPrice);

    const priceOf = (h: Hotel, empty: number) => (hasPrice(h) ? (h.price as number) : empty);

    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => priceOf(a, Infinity) - priceOf(b, Infinity));
    if (sort === "price-desc") sorted.sort((a, b) => priceOf(b, -1) - priceOf(a, -1));
    if (sort === "stars") sorted.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
    if (sort === "recommended" && searched) {
      // available hotels first
      sorted.sort((a, b) => Number(hasPrice(b)) - Number(hasPrice(a)));
    }
    return sorted;
  }, [hotels, activeCity, textQuery, minStars, searched, onlyAvailable, sort]);

  const availableCount = useMemo(() => visibleHotels.filter(hasPrice).length, [visibleHotels]);

  // Placeholders when there is nothing real to show yet; dimmed list when re-searching
  const showSkeleton = isPending && (!searched || visibleHotels.length === 0);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCity, textQuery, minStars, sort, onlyAvailable, lastSearch]);

  const nights = form.checkIn && form.checkOut ? diffDays(form.checkIn, form.checkOut) : 0;

  const resetFilters = () => {
    selectCity("");
    setMinStars(null);
  };

  /* --------------------------------- Render -------------------------------- */
  return (
    <Layout>
      {/* ─────────────────────────── Banner ─────────────────────────── */}
      <section className="relative overflow-hidden bg-[#064B5C] pb-16 pt-6 text-white lg:pb-20">
        <img
          src={BANNER_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#031E26]/95 via-[#064B5C]/85 to-[#0A7C95]/50" />

        {/* One soft gold arc echoing the logo's ring */}
        <svg
          className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 text-[#E3A312] opacity-30"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1.2" strokeDasharray="420 160" />
        </svg>

        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="mb-3 flex items-center gap-1.5 text-xs text-white/70">
            <Link to="/" className="transition-colors hover:text-[#F2B705]">
              Accueil
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span className="text-white">Hôtels Tunisie</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hôtels en Tunisie</h1>
              <div className="mt-2 h-0.5 w-12 rounded-full bg-[#E3A312]" />
            </div>

            {!loading && hotels.length > 0 && (
              <p className="text-sm text-white/80">
                <span className="font-semibold text-[#F2B705]">{hotels.length}</span> hôtels ·{" "}
                <span className="font-semibold text-[#F2B705]">{destinationOptions.length}</span> destinations
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────── Search card (overlaps banner) ───────────────────── */}
      <div className="relative z-10 mx-auto -mt-8 max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="rounded-2xl border border-gray-100 bg-white p-2 shadow-lg ring-1 ring-black/[0.03]"
        >
          <div className="grid grid-cols-1 items-stretch gap-2 md:grid-cols-2 lg:grid-cols-[1.1fr_1.8fr_1.2fr_auto]">
            <DestinationPicker
              value={form.cityName}
              options={destinationOptions}
              totalCount={hotels.length}
              onChange={selectCity}
              loading={loading}
            />

            <DateRangePicker
              className="md:col-span-2 lg:col-span-1"
              label="Dates"
              value={{ from: form.checkIn || undefined, to: form.checkOut || undefined }}
              onChange={(r) => setForm((f) => ({ ...f, checkIn: r.from ?? "", checkOut: r.to ?? "" }))}
              min={today}
              lang="FR"
              badge={nights > 0 ? `${nights} nuit${nights > 1 ? "s" : ""}` : undefined}
            />

            <div>
              <RoomComposer
                rooms={form.rooms}
                onChange={(rooms) => setForm((f) => ({ ...f, rooms }))}
              />
            </div>

            <button
              type="submit"
              disabled={searchLoading}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-7 text-sm font-bold text-[#06303A] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 disabled:opacity-60 md:col-span-2 lg:col-span-1"
            >
              {searchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4" aria-hidden="true" />
              )}
              Rechercher
            </button>
          </div>

          {searchError && (
            <p role="alert" className="mt-2 flex items-center gap-1.5 px-2 pb-1 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {searchError}
            </p>
          )}
        </form>
      </div>

      {/* ───────────────────────── Filters (one slim line) ───────────────────────── */}
      <section className="mx-auto mt-4 max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* Category: one compact segmented control */}
            <div
              role="group"
              aria-label="Catégorie"
              className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white text-sm"
            >
              {([null, 3, 4, 5] as const).map((s, i) => {
                const active = minStars === s;
                return (
                  <button
                    key={s ?? "all"}
                    type="button"
                    onClick={() => setMinStars(s)}
                    aria-pressed={active}
                    className={`flex items-center gap-1 px-3 py-1.5 font-medium transition-colors ${
                      i > 0 ? "border-l border-gray-200" : ""
                    } ${
                      active
                        ? "bg-[#E8F5F8] text-[#0A7C95]"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {s === null ? (
                      "Toutes"
                    ) : (
                      <>
                        {s}
                        <Star className="h-3.5 w-3.5 fill-[#E3A312] text-[#E3A312]" aria-hidden="true" />
                        {s < 5 && <span className="text-xs text-gray-400">+</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Availability: a switch instead of a checkbox */}
            {searched && (
              <button
                type="button"
                role="switch"
                aria-checked={onlyAvailable}
                onClick={() => setOnlyAvailable((v) => !v)}
                className="flex items-center gap-2 rounded text-sm text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]"
              >
                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    onlyAvailable ? "bg-[#0A7C95]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                      onlyAvailable ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </span>
                Disponibles uniquement
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Trier par"
              className="cursor-pointer rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm font-medium text-gray-700 outline-none transition hover:border-gray-300 focus:border-[#0A7C95] focus:ring-2 focus:ring-[#0A7C95]/20"
            >
              <option value="recommended">Recommandés</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="stars">Étoiles</option>
            </select>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Results ───────────────────────── */}
      <section className="min-h-[420px]   py-6 lg:py-8" aria-live="polite">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className={GRID}>
              {Array.from({ length: 8 }).map((_, i) => (
                <HotelCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-500" aria-hidden="true" />
              <p className="mb-4 text-gray-700">{error}</p>
              <button
                type="button"
                onClick={loadCatalog}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A7C95] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#064B5C]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Réessayer
              </button>
            </div>
          ) : (
            <>
              {searchNotice && !isPending && (
                <p
                  role="status"
                  className="mb-4 rounded-lg border border-[#E3A312]/40 bg-[#FFF6DD] px-4 py-3 text-sm text-[#7A5200]"
                >
                  {searchNotice}
                </p>
              )}

              {/* Results summary */}
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                {isPending ? (
                  <span className="inline-flex items-center gap-2 font-medium text-[#0A7C95]">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Recherche des disponibilités en cours…
                  </span>
                ) : searched && lastSearch ? (
                  <>
                    <span className="text-base font-bold text-gray-900">
                      {availableCount} hôtel{availableCount > 1 ? "s" : ""} disponible
                      {availableCount > 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-[#E8F5F8] px-3 py-1 text-xs font-semibold text-[#0A7C95]">
                      {formatDay(lastSearch.checkIn)} → {formatDay(lastSearch.checkOut)}
                    </span>
                    <span>{roomSummary(lastSearch.rooms)}</span>
                  </>
                ) : (
                  <span>
                    <span className="text-base font-bold text-gray-900">{visibleHotels.length}</span>{" "}
                    hôtel{visibleHotels.length > 1 ? "s" : ""} · choisissez vos dates pour voir les prix
                  </span>
                )}
              </div>

              {showSkeleton ? (
                <div className={GRID}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <HotelCardSkeleton key={i} />
                  ))}
                </div>
              ) : visibleHotels.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 text-center">
                  <p className="text-lg font-semibold text-gray-800">
                    {searched && onlyAvailable
                      ? "Aucune disponibilité pour ces dates"
                      : "Aucun hôtel ne correspond à votre recherche"}
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                    Essayez d'autres dates, une autre ville, ou appelez-nous : nous cherchons pour vous.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    {searched && onlyAvailable && (
                      <button
                        type="button"
                        onClick={() => setOnlyAvailable(false)}
                        className="rounded-lg bg-[#0A7C95] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#064B5C]"
                      >
                        Afficher tous les hôtels
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#0A7C95] hover:text-[#0A7C95]"
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`${GRID} transition-opacity ${
                      searchLoading ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    {visibleHotels.slice(0, visibleCount).map((h) => (
                      <HotelCard key={h.id} hotel={h} searchParams={lastSearch ?? undefined} />
                    ))}
                  </div>

                  {visibleCount < visibleHotels.length && (
                    <div className="mt-8 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        className="rounded-full border-2 border-[#0A7C95] px-7 py-2.5 text-sm font-bold text-[#0A7C95] transition hover:bg-[#0A7C95] hover:text-white"
                      >
                        Afficher plus ({visibleHotels.length - visibleCount})
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

     
    </Layout>
  );
}