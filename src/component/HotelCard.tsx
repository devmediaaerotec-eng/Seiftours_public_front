import { useState } from "react";
import { Star, MapPin, Building2, CalendarX, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { encodeRooms, type RoomConfig } from "@/lib/booking";

export interface Hotel {
  id?: string;
  cityId?: number;
  name: string;
  location: string;
  image: string;
  /** Optional: only displayed when real data exists */
  rating?: number;
  reviews?: number;
  price: number | null;
  oldPrice?: number;
  stars: number;
  features?: string[];
  badge?: string;
}

export interface HotelSearchParams {
  checkIn: string;
  checkOut: string;
  /** Preferred: every room with children ages */
  rooms?: RoomConfig[];
  /** Fallback totals when rooms are not available */
  adults?: number;
  children?: number;
}

interface HotelCardProps {
  hotel: Hotel;
  /** Present only after a search: lets the card tell "unavailable" from "price on request" */
  searchParams?: HotelSearchParams;
}

const priceFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/* -------------------------------------------------------------------------- */
/*  Image with graceful fallback                                              */
/* -------------------------------------------------------------------------- */
function HotelImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#064B5C] to-[#0A7C95]">
        <Building2 className="h-10 w-10 text-white/35" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Price                                                                     */
/* -------------------------------------------------------------------------- */
function PriceBlock({
  price,
  oldPrice,
  searched,
}: {
  price: number | null;
  oldPrice?: number;
  searched: boolean;
}) {
  if (price === 0) {
    return <p className="text-xs italic text-gray-400">Disponibilité non confirmée</p>;
  }

  if (price === null) {
    return searched ? (
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <CalendarX className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
        Indisponible à ces dates
      </p>
    ) : (
      <p className="text-xs italic text-gray-400">Prix sur demande</p>
    );
  }

  return (
    <div className="leading-tight">
      {oldPrice && oldPrice > price && (
        <span className="mr-1.5 text-xs text-gray-400 line-through">{priceFormat.format(oldPrice)}</span>
      )}
      <span className="text-[11px] text-gray-500">à partir de</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-extrabold text-[#0A7C95]">{priceFormat.format(price)}</span>
        <span className="text-xs text-gray-500">TND / nuit</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */
function CardInner({ hotel, searched }: { hotel: Hotel; searched: boolean }) {
  const stars = Math.max(0, Math.min(Math.round(hotel.stars || 0), 5));
  const unavailable = searched && !(hotel.price != null && hotel.price > 0);

  return (
    <>
      <div className="relative h-36 overflow-hidden bg-gray-100">
        <div className={`h-full w-full ${unavailable ? "grayscale-[60%]" : ""}`}>
          <HotelImage key={hotel.image} src={hotel.image} alt={hotel.name} />
        </div>

        {hotel.badge && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-[#F2B705] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#06303A] shadow-sm">
            {hotel.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3
          title={hotel.name}
          className="line-clamp-1 text-[15px] font-semibold text-gray-900 transition-colors group-hover:text-[#0A7C95]"
        >
          {hotel.name}
        </h3>

        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          {stars > 0 && (
            <span className="flex shrink-0 items-center gap-0.5" role="img" aria-label={`${stars} étoiles`}>
              {Array.from({ length: stars }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-[#E3A312] text-[#E3A312]" aria-hidden="true" />
              ))}
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{hotel.location}</span>
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <PriceBlock price={hotel.price} oldPrice={hotel.oldPrice} searched={searched} />
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F5F8] text-[#0A7C95] transition-colors group-hover:bg-[#0A7C95] group-hover:text-white"
          >
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </>
  );
}

export default function HotelCard({ hotel, searchParams }: HotelCardProps) {
  const searched = !!searchParams;

  const baseClass =
    "group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-[#0A7C95]/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2";

  if (hotel.id) {
    const params = new URLSearchParams({ name: hotel.name, image: hotel.image });

    if (searchParams) {
      params.set("checkIn", searchParams.checkIn);
      params.set("checkOut", searchParams.checkOut);

      if (searchParams.rooms?.length) {
        // Same format as the hotels page URL, so the detail page can rebuild every room
        params.set("guests", encodeRooms(searchParams.rooms));
        params.set("adults", String(searchParams.rooms.reduce((s, r) => s + r.adults, 0)));
        params.set("children", String(searchParams.rooms.reduce((s, r) => s + r.children, 0)));
      } else {
        if (searchParams.adults != null) params.set("adults", String(searchParams.adults));
        if (searchParams.children != null) params.set("children", String(searchParams.children));
      }
    }

    return (
      <Link to={`/hotels/${hotel.id}?${params.toString()}`} className={baseClass}>
        <CardInner hotel={hotel} searched={searched} />
      </Link>
    );
  }

  return (
    <div className={baseClass}>
      <CardInner hotel={hotel} searched={searched} />
    </div>
  );
}

/** Loading placeholder with the same proportions as the card */
export function HotelCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="h-36 animate-pulse bg-gray-200" />
      <div className="space-y-2.5 p-3.5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
        <div className="flex items-end justify-between pt-3">
          <div className="h-8 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  );
}