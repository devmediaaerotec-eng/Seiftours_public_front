import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import ImageCarousel from "@/components/ImageCarousel";
import StayEditor, { type Stay } from "@/components/Stayeditor";
import { mygoApi, extractSearchHotels, extractHotelId } from "@/lib/mygoApi";
import { friendlyApiError } from "@/lib/hotelCatalog";
import { decodeRooms, diffDays, encodeRooms, fromISO, isISO, todayISO } from "@/lib/booking";
import { saveDraft } from "@/lib/checkoutDraft";
import { amountsFor, cancellationSummary } from "@/lib/Payment";
import {
  AlertCircle,
  Star,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ShieldCheck,
  BedDouble,
  Utensils,
  CalendarDays,
  RefreshCw,
  Wifi,
  Waves,
  SquareParking,
  UtensilsCrossed,
  Sparkles,
  Dumbbell,
  Snowflake,
  Umbrella,
  Baby,
  Martini,
  Accessibility,
  ConciergeBell,
  Tv,
  Shirt,
  Coffee,
  Volleyball,
  type LucideIcon,
} from "lucide-react";



const PRICE_BASIS: "night" | "stay" = "night";


const OFFER_TTL_MS = 10 * 60 * 1000;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80";

  
interface RoomOption {
  RoomId: number;
  Name: string;
  BoardingId: number;
  BoardingName: string;
  Price: number;
  CancellationPolicy?: any[];
}



function htmlToText(html: string): string {
  if (!html) return "";
  return (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "").trim();
}

const priceFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const money = (n: number) => `${priceFormat.format(n)} TND`;

const AMENITY_ICONS: [RegExp, LucideIcon][] = [
  [/wi-?fi|internet/i, Wifi],
  [/piscine|pool|aquapark|toboggan/i, Waves],
  [/parking|garage/i, SquareParking],
  [/restaurant|buffet|snack/i, UtensilsCrossed],
  [/spa|hammam|massage|thalasso|sauna|bien-être/i, Sparkles],
  [/fitness|gym|sport|musculation/i, Dumbbell],
  [/clim|air conditionn/i, Snowflake],
  [/plage|beach|transat|parasol/i, Umbrella],
  [/enfant|kids|baby|bébé|mini.?club/i, Baby],
  [/bar|lounge|cocktail/i, Martini],
  [/handicap|mobilité|accessib/i, Accessibility],
  [/réception|reception|concierge|24h|24\/24/i, ConciergeBell],
  [/tv|télé|satellite/i, Tv],
  [/blanchisserie|laverie|pressing/i, Shirt],
  [/café|coffee|thé|petit.?déjeuner/i, Coffee],
  [/tennis|volley|golf|animation|jeux/i, Volleyball],
];
const amenityIcon = (name: string): LucideIcon =>
  AMENITY_ICONS.find(([re]) => re.test(name))?.[1] ?? CircleCheck;

const POLICY_LABELS: Record<string, string> = {
  BEFORE_ARRIVAL: "Annulation avant l'arrivée",
  NO_SHOW: "Non-présentation",
  PREMATURE_DEPARTURE: "Départ anticipé",
};

/** MyGo room policy item: { Fees: "100.00", Type: "PERCENT" | "NIGHT", Nature: "BEFORE_ARRIVAL", FromDate?: "15-10-2026 00:00" } */
function describePolicy(p: any): string {
  const label = POLICY_LABELS[p?.Nature] ?? p?.Nature ?? "Annulation";
  const n = Number(p?.Fees ?? 0);
  const fees = p?.Type === "PERCENT" ? `${n} %` : p?.Type === "NIGHT" ? `${n} nuit${n > 1 ? "s" : ""}` : `${n}`;
  return `${label}${p?.FromDate ? ` (à partir du ${p.FromDate})` : ""} : ${fees} de frais`;
}

/** Flattens MyGo's Price.Boarding[].Pax[].Rooms[] into flat room options */
function toRoomOptions(match: any): RoomOption[] {
  return (match?.Price?.Boarding ?? []).flatMap((b: any) =>
    (b.Pax ?? []).flatMap((p: any) =>
      (p.Rooms ?? [])
        .filter((r: any) => !r.StopReservation)
        .map((r: any) => ({
          RoomId: r.Id as number,
          Name: r.Name ?? "Chambre",
          BoardingId: b.Id as number,
          BoardingName: b.Name ?? "",
          Price: parseFloat(r.Price ?? "0"),
          CancellationPolicy: r.CancellationPolicy,
        }))
    )
  );
}

// Hotel details do not change between searches: keep them for the session (saves supplier calls)
const detailCache = new Map<number, any>();

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const hotelId = parseInt(id ?? "0", 10);
  const today = useMemo(() => todayISO(), []);

  /* ---------------------------- Stay from the URL ---------------------------- */
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const hasDates = isISO(checkIn) && isISO(checkOut) && checkOut > checkIn;
  const guestsParam = searchParams.get("guests") ?? "";
  const legacyAdults = parseInt(searchParams.get("adults") ?? "2", 10) || 2;
  const legacyChildren = parseInt(searchParams.get("children") ?? "0", 10) || 0;
  const occupancy = useMemo(
    () =>
      decodeRooms(guestsParam) ?? [{ adults: legacyAdults, children: legacyChildren, childrenAges: [] }],
    [guestsParam, legacyAdults, legacyChildren]
  );
  const adults = occupancy.reduce((s, r) => s + r.adults, 0);
  const children = occupancy.reduce((s, r) => s + r.children, 0);
  const nameFromUrl = searchParams.get("name") ?? "";
  const imageFromUrl = searchParams.get("image") ?? "";
  const nights = hasDates ? diffDays(checkIn, checkOut) : 0;

  /* --------------------------------- State ---------------------------------- */
  const [detail, setDetail] = useState<any>(() => detailCache.get(hotelId) ?? null);
  const [detailLoading, setDetailLoading] = useState(!detailCache.has(hotelId));
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [offers, setOffers] = useState<RoomOption[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedAt, setSearchedAt] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(Date.now());

  const [pick, setPick] = useState<{ roomId: number; boardingId: number } | null>(null);


  /* ------------------------- Hotel details (once per hotel) ------------------------- */
  useEffect(() => {
    if (!hotelId) return;
    const cached = detailCache.get(hotelId);
    if (cached) {
      setDetail(cached);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    mygoApi
      .hotelDetail(hotelId)
      .then((res: any) => {
        const hotel = res?.Hotel ?? res?.HotelDetail ?? res;
        detailCache.set(hotelId, hotel);
        if (!cancelled) setDetail(hotel);
      })
      .catch((err: unknown) => {
        if (!cancelled) setDetailError(friendlyApiError(err, "Impossible de charger les informations de l'hôtel."));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  /* ----------- Availability: runs again each time dates / rooms change ----------- */
  useEffect(() => {
    if (!hotelId || !hasDates) {
      setOffers([]);
      setToken(null);
      setSearchedAt(null);
      return;
    }

    let cancelled = false; // ignore answers that arrive after a newer search started
    setSearching(true);
    setSearchError(null);

    mygoApi
      .hotelSearch({ hotelIds: [hotelId], checkIn, checkOut, rooms: occupancy }, { fresh: true })
      .then((res: any) => {
        if (cancelled) return;
        const match = extractSearchHotels(res).find((e: any) => extractHotelId(e) === hotelId);
        const options = match ? toRoomOptions(match) : [];

        setToken(match?.Token ?? null);
        setOffers(options);
        setSearchedAt(Date.now());
        // keep the previous choice if it still exists, otherwise the first offer
        setPick((prev) => {
          const same = prev && options.find((o) => o.RoomId === prev.roomId && o.BoardingId === prev.boardingId);
          const next = same ?? options[0];
          return next ? { roomId: next.RoomId, boardingId: next.BoardingId } : null;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOffers([]);
        setToken(null);
        setSearchError(friendlyApiError(err, "Impossible de vérifier les disponibilités."));
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hotelId, hasDates, checkIn, checkOut, occupancy, refreshKey]);

  // Tick so "prices are old" appears by itself
  useEffect(() => {
    if (!searchedAt) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [searchedAt]);
  const stale = searchedAt !== null && now - searchedAt > OFFER_TTL_MS;

  /* ------------------------------ Modify the stay ------------------------------ */
  const applyStay = useCallback(
    (stay: Stay) => {
      const next = new URLSearchParams(searchParams);
      next.set("checkIn", stay.checkIn);
      next.set("checkOut", stay.checkOut);
      next.set("guests", encodeRooms(stay.rooms));
      next.set("adults", String(stay.rooms.reduce((s, r) => s + r.adults, 0)));
      next.set("children", String(stay.rooms.reduce((s, r) => s + r.children, 0)));
      setSearchParams(next, { replace: true }); // replace: the back button still returns to the list
    },
    [searchParams, setSearchParams]
  );

  const refreshOffers = () => {
    setNow(Date.now());
    setRefreshKey((k) => k + 1);
  };

  /* ------------------------------ Derived values ------------------------------ */
  const photos = useMemo<string[]>(() => {
    const raw = detail?.Album ?? detail?.ListPhoto ?? detail?.Photos ?? detail?.ImageList ?? detail?.Gallery ?? [];
    const list: string[] = Array.isArray(raw)
      ? raw.map((p: any) => (typeof p === "string" ? p : p?.Url)).filter(Boolean)
      : [];
    const main: string = detail?.Image ?? detail?.MainImage ?? "";
    if (main && !list.includes(main)) list.unshift(main);
    return list.length > 0 ? list : [imageFromUrl || FALLBACK_IMAGE];
  }, [detail, imageFromUrl]);

  const facilities: string[] = useMemo(
    () =>
      (detail?.Facilitie ?? detail?.Facilities ?? detail?.ListFacility ?? detail?.Amenities ?? []).map(
        (f: any) => f.Title ?? f.Name ?? f
      ),
    [detail]
  );

  const description = useMemo(
    () => htmlToText(detail?.Description ?? detail?.LongDescription ?? detail?.ShortDescription ?? ""),
    [detail]
  );
  const longDescription = description.length > 420;

  const hotelName: string = (detail?.Name ?? nameFromUrl) || `Hôtel #${hotelId}`;
  const hotelCity: string = detail?.City?.Name ?? "";
  const hotelStars: number = Math.min(detail?.Category?.Star ?? detail?.Stars ?? 3, 5);
  const hotelPhone: string = detail?.Phone ?? detail?.Tel ?? "";
  const hotelAddress: string = detail?.Adress ?? detail?.Address ?? "";

  const stayTotal = (r: RoomOption) => (PRICE_BASIS === "night" ? r.Price * nights : r.Price);
  const perNight = (r: RoomOption) => (PRICE_BASIS === "night" ? r.Price : r.Price / Math.max(1, nights));

  // The same room can come with several boards (half board, all inclusive…): match both
  const selected = offers.find((o) => o.RoomId === pick?.roomId && o.BoardingId === pick?.boardingId) ?? null;
  const total = selected ? stayTotal(selected) : 0;
  const amounts = selected && total > 0 ? amountsFor(total) : null;
  const cancellation = cancellationSummary(selected?.CancellationPolicy);
  const lowestTotal = offers.length ? Math.min(...offers.map(stayTotal)) : null;
  const lowestPerNight = offers.length ? Math.min(...offers.map(perNight)) : null;
  const canBook = offers.length > 0 && hasDates;

const totalWithMarkup = total * 1.15;

  /* ------------------------------- Booking flow ------------------------------- */
  // Step 1 -> step 2: remember what the visitor chose, then open the checkout page (/checkout).
  const goToCheckout = () => {
    if (!selected || !token || !hasDates || searching || stale) return;
    saveDraft({
      hotelId,
      hotelName,
      stars: hotelStars,
      city: hotelCity || undefined,
      imageUrl: photos[0],
      checkIn,
      checkOut,
      rooms: occupancy,
      token,
      roomId: selected.RoomId,
      boardingId: selected.BoardingId,
      roomName: selected.Name,
      boardingName: selected.BoardingName,
      total,
      cancellation,
      savedAt: searchedAt ?? Date.now(), // the MyGo token ages from the search, not from the click
    });
    navigate("/checkout");
  };

  const fmtDay = (iso: string) =>
    isISO(iso)
      ? new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(fromISO(iso))
      : iso;

  const card = "rounded-3xl border border-gray-200/70 bg-white p-5 shadow-sm sm:p-6";

  /* --------------------------------- Screens --------------------------------- */
  if (detailLoading) {
    return (
      <Layout>
        <div role="status" className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="skeleton h-4 w-56 rounded" />
          <div className="skeleton mt-6 h-8 w-2/3 max-w-md rounded-lg" />
          <div className="skeleton mt-3 h-4 w-48 rounded" />
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="skeleton aspect-[4/3] rounded-3xl sm:aspect-[16/9]" />
              <div className="skeleton h-40 rounded-3xl" />
            </div>
            <div className="skeleton h-[420px] rounded-3xl" />
          </div>
          <span className="sr-only">Chargement de l'hôtel…</span>
        </div>
      </Layout>
    );
  }

  if (detailError) {
    return (
      <Layout>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertCircle className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-xl font-extrabold text-gray-900">Hôtel indisponible</h1>
          <p className="mt-2 text-gray-600">{detailError}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0A7C95] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#064B5C]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Retour
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-16">
        {/* ── Breadcrumb ─────────────────────────────────────────────── */}
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-gray-500">
          <Link to="/" className="transition-colors hover:text-[#0A7C95]">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <Link to="/hotels-tunisie" className="shrink-0 transition-colors hover:text-[#0A7C95]">Hôtels Tunisie</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1 font-medium text-gray-900">{hotelName}</span>
        </nav>

        {/* ── Title ──────────────────────────────────────────────────── */}
        <header className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-[#FFF6DD] px-2.5 py-1"
                role="img"
                aria-label={`${hotelStars} étoiles`}
              >
                {Array.from({ length: hotelStars }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-[#E3A312] text-[#E3A312]" aria-hidden="true" />
                ))}
              </span>
              {hotelCity && (
                <span className="rounded-full bg-[#E8F5F8] px-2.5 py-1 text-xs font-semibold text-[#064B5C]">
                  {hotelCity}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
              {hotelName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              {(hotelCity || hotelAddress) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-[#0A7C95]" aria-hidden="true" />
                  {[hotelAddress, hotelCity].filter(Boolean).join(", ")}
                </span>
              )}
              {hotelPhone && (
                <a href={`tel:${hotelPhone}`} className="inline-flex items-center gap-1.5 hover:text-[#0A7C95]">
                  <Phone className="h-4 w-4 shrink-0 text-[#0A7C95]" aria-hidden="true" />
                  {hotelPhone}
                </a>
              )}
            </div>
          </div>

          {lowestTotal !== null && (
            <div className="hidden text-right sm:block">
              <p className="text-xs text-gray-500">À partir de</p>
              <p className="text-3xl font-extrabold text-[#0A7C95]">{money(lowestTotal)}</p>
              <p className="text-xs text-gray-500">
                pour {nights} nuit{nights > 1 ? "s" : ""}
                {lowestPerNight !== null && ` · ${money(Math.round(lowestPerNight))} / nuit`}
              </p>
            </div>
          )}
        </header>

        {/* ── Stay: dates and rooms, editable here ───────────────────── */}
        <div className="mt-5">
          <StayEditor
            today={today}
            checkIn={checkIn}
            checkOut={checkOut}
            rooms={occupancy}
            onApply={applyStay}
            busy={searching}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* ── Left column ───────────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">
            <ImageCarousel photos={photos} alt={hotelName} />

            {/* Rooms and prices: right after the photos, it is what visitors look for */}
            <section className={`${card} scroll-mt-28`} id="chambres" aria-live="polite">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900">Chambres disponibles</h2>
                {hasDates && (
                  <span className="text-sm text-gray-500">
                    {fmtDay(checkIn)} → {fmtDay(checkOut)} · {nights} nuit{nights > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {!hasDates ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#E8F5F8] p-4 text-sm text-[#064B5C]">
                  <CalendarDays className="h-5 w-5 shrink-0 text-[#0A7C95]" aria-hidden="true" />
                  Choisissez vos dates ci-dessus pour voir les chambres et les prix.
                </div>
              ) : searching && offers.length === 0 ? (
                <div className="mt-4 space-y-3" role="status">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="skeleton h-[76px] rounded-2xl" />
                  ))}
                  <span className="sr-only">Recherche des chambres…</span>
                </div>
              ) : searchError ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <div>
                    {searchError}
                    <button
                      type="button"
                      onClick={refreshOffers}
                      className="mt-2 flex items-center gap-1.5 font-semibold underline"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Réessayer
                    </button>
                  </div>
                </div>
              ) : offers.length === 0 ? (
                <div className="mt-4 flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF6DD] text-[#7A5200]">
                    <BedDouble className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">Aucune chambre disponible à ces dates</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Essayez d'autres dates avec le bouton « Modifier », ou contactez-nous : nous vérifions
                      directement auprès de l'hôtel.
                    </p>
                    <Link
                      to={`/contact?subject=hotels&message=${encodeURIComponent(
                        `Bonjour, je cherche une chambre à l'hôtel ${hotelName} du ${fmtDay(checkIn)} au ${fmtDay(checkOut)} (${adults} adulte${adults > 1 ? "s" : ""}${children ? `, ${children} enfant${children > 1 ? "s" : ""}` : ""}).`
                      )}`}
                      className="mt-3 inline-block rounded-xl bg-[#0A7C95] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#064B5C]"
                    >
                      Nous contacter
                    </Link>
                  </div>
                </div>
              ) : (
                <div
                  className={`mt-4 space-y-3 transition-opacity ${searching ? "pointer-events-none opacity-60" : ""}`}
                  role="radiogroup"
                  aria-label="Type de chambre"
                >
                  {offers.map((o) => {
                    const isSelected = pick?.roomId === o.RoomId && pick?.boardingId === o.BoardingId;
                    const isBest = offers.length > 1 && stayTotal(o) === lowestTotal;
                    return (
                      <label
                        key={`${o.BoardingId}-${o.RoomId}`}
                        className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 p-4 transition-all ${
                          isSelected
                            ? "border-[#0A7C95] bg-[#E8F5F8]/60 shadow-sm"
                            : "border-gray-200 hover:border-[#0A7C95]/40"
                        }`}
                      >
                        <span className="flex min-w-0 items-start gap-3">
                          <input
                            type="radio"
                            name="room"
                            className="mt-1 h-4 w-4 shrink-0 accent-[#0A7C95]"
                            checked={isSelected}
                            onChange={() => setPick({ roomId: o.RoomId, boardingId: o.BoardingId })}
                          />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-gray-900">
                              <BedDouble className="h-4 w-4 shrink-0 text-[#0A7C95]" aria-hidden="true" />
                              {o.Name}
                              {isBest && (
                                <span className="rounded-full bg-[#F2B705] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#06303A]">
                                  Meilleur prix
                                </span>
                              )}
                            </span>
                            {o.BoardingName && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FFF6DD] px-2 py-0.5 text-xs font-medium text-[#7A5200]">
                                <Utensils className="h-3 w-3" aria-hidden="true" /> {o.BoardingName}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-lg font-extrabold text-[#0A7C95] sm:text-xl">
                            {money(stayTotal(o))}
                          </span>
                          <span className="block text-[11px] text-gray-500">
                            {nights} nuit{nights > 1 ? "s" : ""} · {money(Math.round(perNight(o)))} / nuit
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            {description && (
              <section className={card}>
                <h2 className="text-lg font-bold text-gray-900">À propos de l'hôtel</h2>
                <p
                  className={`mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600 ${
                    longDescription && !showFullDescription ? "line-clamp-5" : ""
                  }`}
                >
                  {description}
                </p>
                {longDescription && (
                  <button
                    type="button"
                    onClick={() => setShowFullDescription((v) => !v)}
                    className="mt-2 text-sm font-semibold text-[#0A7C95] hover:underline"
                  >
                    {showFullDescription ? "Réduire" : "Lire la suite"}
                  </button>
                )}
              </section>
            )}

            {facilities.length > 0 && (
              <section className={card}>
                <h2 className="text-lg font-bold text-gray-900">Équipements & services</h2>
                <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  {facilities.map((f, i) => {
                    const Icon = amenityIcon(f);
                    return (
                      <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F5F8] text-[#0A7C95]">
                          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                        </span>
                        {f}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {selected?.CancellationPolicy && selected.CancellationPolicy.length > 0 && (
              <section className={card}>
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <ShieldCheck className="h-5 w-5 text-[#0A7C95]" aria-hidden="true" />
                  Politique d'annulation
                </h2>
                <ul className="mt-3 space-y-2">
                  {selected.CancellationPolicy.map((p: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                      <span>{describePolicy(p)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ── Right column: booking card (details are asked on /checkout) ───────── */}
          <aside className="scroll-mt-28 lg:col-span-1" id="reserver">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-3xl border border-gray-200/70 border-t-4 border-t-[#E3A312] bg-white shadow-xl shadow-[#064B5C]/5">
                <div className="space-y-4 p-5 sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Votre réservation</h2>
                    {selected ? (
                      <p className="mt-1 text-sm text-gray-600">
                        {selected.Name}
                        {selected.BoardingName ? ` · ${selected.BoardingName}` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">Choisissez une chambre pour voir le prix.</p>
                    )}
                  </div>

                  {stale && (
                    <div className="flex items-start gap-2 rounded-xl border border-[#E3A312]/40 bg-[#FFF6DD] p-3 text-sm text-[#7A5200]">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <div className="flex-1">
                        Les tarifs datent de plus de 10 minutes.
                        <button
                          type="button"
                          onClick={refreshOffers}
                          disabled={searching}
                          className="ml-2 inline-flex items-center gap-1 font-semibold underline disabled:opacity-60"
                        >
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Actualiser
                        </button>
                      </div>
                    </div>
                  )}

                  {selected && total > 0 && (
                    <div className="border-t border-dashed border-gray-200 pt-4">
                      <div className="flex items-end justify-between gap-3">
 













                       
<div>
  <p className="text-sm font-semibold text-gray-900">
    Prix total
  </p>
  <p className="text-xs text-gray-500">
    {nights} nuit{nights > 1 ? "s" : ""}
  </p>
</div>

<p className="text-3xl font-extrabold leading-none text-gray-900">
  {priceFormat.format(totalWithMarkup)}
  <sup className="ml-0.5 text-xs font-bold">TND</sup>
</p>

 

                      </div>
                      <p className="mt-1 text-right text-xs text-gray-500">Des frais peuvent s'appliquer</p>

                      {amounts && (
                        <dl className="mt-3 space-y-1 rounded-xl bg-[#E8F5F8]/70 px-3 py-2.5 text-xs">
                          <div className="flex justify-between">
                            <dt className="text-gray-600">À payer maintenant (acompte)</dt>
                            <dd className="font-bold text-[#0A7C95]">{money(amounts.deposit)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Reste à régler à l'hôtel</dt>
                            <dd className="font-semibold text-gray-800">{money(amounts.remaining)}</dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  )}

                  {cancellation && (
                    <p
                      className={`flex items-center justify-center gap-1.5 text-center text-sm font-medium ${
                        cancellation.tone === "free" ? "text-emerald-700" : "text-[#8A5A00]"
                      }`}
                    >
                      {cancellation.tone === "free" ? (
                        <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      {cancellation.text}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={goToCheckout}
                    disabled={!selected || !canBook || searching || stale}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-4 text-[15px] font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Réserver
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <p className="text-center text-xs text-gray-500">Vous ne payez rien à cette étape.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

       {canBook && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(6,48,58,0.08)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-gray-500">{selected ? "Total" : "À partir de"}</p>
              <p className="text-lg font-extrabold text-[#0A7C95]">
                {selected ? money(total) : lowestTotal !== null ? money(lowestTotal) : "—"}
              </p>
            </div>
            <a
              href={selected ? "#reserver" : "#chambres"}
              className="rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-5 py-3 text-sm font-bold text-[#06303A] shadow-md"
            >
              {selected ? "Réserver" : "Choisir une chambre"}
            </a>
          </div>
        </div>
      )}

    </Layout>
  );
}