import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  MapPin,
  Hotel as HotelIcon,
  Search,
  Phone,
  MessageCircle,
} from "lucide-react";
import { getHotelCatalog } from "@/lib/hotelCatalog";
import { useNav } from "@/hooks/Usenav";

/* -------------------------------------------------------------------------- */
/*  Coordonnées agence                                                        */
/* -------------------------------------------------------------------------- */
const PHONE_DISPLAY = "+216 20 965 714";
const PHONE_HREF = "tel:+21620965714";
const WHATSAPP_HREF = "https://wa.me/21620965714";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/share/1YMv5nJFbZ/?mibextid=wwXIfr", Icon: FacebookIcon },
  { label: "Instagram", href: "https://www.instagram.com/safes_tour/", Icon: InstagramIcon },
  { label: "WhatsApp", href: WHATSAPP_HREF, Icon: MessageCircle },
 ];

/* -------------------------------------------------------------------------- */
/*  Routes                                                                    */
/* -------------------------------------------------------------------------- */
const ROUTES = {
  hotels: "/hotels-tunisie",
  trips: "/voyage-organise",
  omra: "/omra",
  circuits: "/circuit",
  deals: "/bons-plans",
  transport: "/transport",
  flights: "/vol",
  contact: "/contact",
};

interface MenuLink {
  label: string;
  to: string;
}
interface MenuGroup {
  title: string;
  links: MenuLink[];
  hint?: string;
}
interface Item {
  key: string;
  label: string;
  to: string;
  groups?: MenuGroup[];
  all?: MenuLink;
}

/* -------------------------------------------------------------------------- */
/*  Types MyGo                                                                */
/* -------------------------------------------------------------------------- */
type MyGoHotel = {
  Id: number | string;
  Name: string;
  City?: { Id: number | string; Name: string };
};
type Destination = { id: string; name: string; hotels: MyGoHotel[] };
type LoadStatus = "idle" | "loading" | "ready" | "error";

/* -------------------------------------------------------------------------- */
/*  Construction des items                                                    */
/* -------------------------------------------------------------------------- */
function useItems(
  destinations: Destination[],
  hotels: MyGoHotel[],
  hotelsStatus: LoadStatus,
  hotelSearch: string
): Item[] {
  const nav = useNav();

  return useMemo<Item[]>(() => {
    const q = hotelSearch.trim().toLocaleLowerCase("fr");
    const filteredHotels = q
      ? hotels.filter((h) => {
          const name = h.Name.toLocaleLowerCase("fr");
          const city = h.City?.Name?.toLocaleLowerCase("fr") ?? "";
          return name.includes(q) || city.includes(q);
        })
      : hotels;

    return [
      {
        key: "hotels",
        label: "Hôtels",
        to: ROUTES.hotels,
        all: { label: "Tous les hôtels", to: ROUTES.hotels },
        groups: [
          {
            title: "Destinations",
            links: destinations.map((d) => ({
              label: `${d.name} (${d.hotels.length})`,
              to: `/hotels-tunisie?cityId=${encodeURIComponent(d.id)}`,
            })),
          },
          {
            title: "Tous nos hôtels",
            links:
              hotelsStatus === "ready"
                ? filteredHotels.map((h) => ({
                    label: h.Name,
                    to: `/hotels/${h.Id}`,
                  }))
                : [],
            hint:
              hotelsStatus === "loading" || hotelsStatus === "idle"
                ? "Chargement…"
                : hotelsStatus === "error"
                ? "Erreur de chargement"
                : undefined,
          },
        ],
      },
      {
        key: "trips",
        label: "Voyages organisés",
        to: ROUTES.trips,
        all: { label: "Tous les voyages organisés", to: ROUTES.trips },
        groups: [
          {
            title: "Destinations",
            links: nav.destinations.map((d) => ({
              label: d.name,
              to: `${ROUTES.trips}?destination=${d.slug}`,
            })),
          },
          {
            title: "Omra",
            hint: "Voyage spirituel",
            links: [{ label: "Nos forfaits Omra", to: ROUTES.omra }],
          },
          {
            title: "Circuits",
            links: nav.regions.map((r) => ({
              label: r.name,
              to: `${ROUTES.circuits}?region=${r.slug}`,
            })),
          },
        ].filter((g) => g.links.length > 0),
      },
      {
        key: "deals",
        label: "Bons plans",
        to: ROUTES.deals,
        
      },
      { key: "transport", label: "Transport", to: ROUTES.transport },
      { key: "flights", label: "Vols", to: ROUTES.flights },
      { key: "contact", label: "Contact", to: ROUTES.contact },
    ];
  }, [nav, destinations, hotels, hotelsStatus, hotelSearch]);
}

export default function Navbar() {
  const { pathname } = useLocation();

  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const [hotels, setHotels] = useState<MyGoHotel[]>([]);
  const [hotelsStatus, setHotelsStatus] = useState<LoadStatus>("idle");
  const [hotelSearch, setHotelSearch] = useState("");

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLElement>(null);

   const mountedRef = useRef(true);
  const requestedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadHotels = useCallback(async () => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    setHotelsStatus("loading");
    try {
      const { hotels: list } = await getHotelCatalog();
      const valid = list.filter(
        (h: MyGoHotel) => h.Id != null && String(h.Name ?? "").trim().length > 0
      );
      if (mountedRef.current) {
        setHotels(valid);
        setHotelsStatus("ready");
      }
    } catch (error) {
      console.error("[Navbar] Erreur chargement MyGo :", error);
      requestedRef.current = false;
      if (mountedRef.current) setHotelsStatus("error");
    }
  }, []);

  useEffect(() => {
    if (open === "hotels" || mobileOpen === "hotels") loadHotels();
  }, [open, mobileOpen, loadHotels]);

  /* ------------------------- Destinations dérivées ------------------------- */
  const destinations = useMemo<Destination[]>(() => {
    const grouped = new Map<string, Destination>();
    for (const hotel of hotels) {
      const cityId = hotel.City?.Id;
      const cityName = hotel.City?.Name?.trim();
      if (cityId == null || !cityName) continue;
      const id = String(cityId);
      if (!grouped.has(id)) grouped.set(id, { id, name: cityName, hotels: [] });
      grouped.get(id)!.hotels.push(hotel);
    }
    return Array.from(grouped.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "fr")
    );
  }, [hotels]);

  const items = useItems(destinations, hotels, hotelsStatus, hotelSearch);

  const closeAll = useCallback(() => {
    setOpen(null);
    setDrawer(false);
    setMobileOpen(null);
    setHotelSearch("");
  }, []);

  useEffect(closeAll, [pathname, closeAll]);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node))
        setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [closeAll]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => mq.matches && setDrawer(false);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const hoverOpen = (key: string) => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(key);
  };
  const hoverClose = () => {
    closeTimer.current = window.setTimeout(() => {
      setOpen(null);
      closeTimer.current = null;
    }, 150);
  };

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const hotelsLoading = hotelsStatus === "idle" || hotelsStatus === "loading";
  const hotelsError = hotelsStatus === "error";

  /* ------------------------- Rendu d'un groupe (desktop) ------------------------- */
  const renderDesktopGroup = (g: MenuGroup, isHotelsColumn: boolean) => (
    <div key={g.title} className="min-w-0">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#E3A312]">
          {g.title}
        </p>
        {isHotelsColumn && g.links.length > 0 && (
          <span className="rounded-full bg-[#E8F5F8] px-2 py-0.5 text-[10px] font-bold text-[#0A7C95]">
            {g.links.length}
          </span>
        )}
      </div>
      {g.hint && <p className="mb-2 text-xs text-gray-500">{g.hint}</p>}

      {isHotelsColumn && g.title === "Destinations" && hotelsLoading && (
        <p className="px-2 py-1.5 text-sm text-gray-500">Chargement…</p>
      )}
      {isHotelsColumn && g.title === "Destinations" && hotelsError && (
        <p className="px-2 py-1.5 text-sm text-red-600">
          Impossible de charger les destinations.
        </p>
      )}

      <ul className="scrollbar-thin max-h-[55vh] space-y-0.5 overflow-y-auto pr-1">
        {g.links.length === 0 &&
          isHotelsColumn &&
          g.title === "Destinations" &&
          hotelsStatus === "ready" && (
            <li className="px-2 py-1.5 text-sm text-gray-500">
              Aucune destination disponible.
            </li>
          )}

        {g.links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              onClick={closeAll}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[#06303A] hover:bg-[#E8F5F8] hover:text-[#0A7C95]"
            >
              <span className="truncate">{l.label}</span>
              {isHotelsColumn && g.title === "Destinations" && (
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-300" aria-hidden="true" />
              )}
            </Link>
          </li>
        ))}

        {isHotelsColumn &&
          g.title === "Tous nos hôtels" &&
          hotelsStatus === "ready" &&
          g.links.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-gray-500">
              {hotelSearch.trim()
                ? `Aucun hôtel ne correspond à « ${hotelSearch.trim()} ».`
                : "Aucun hôtel disponible."}
            </li>
          )}
      </ul>
    </div>
  );

  /* ------------------------- Rendu d'un groupe (mobile) ------------------------- */
  const renderMobileGroup = (g: MenuGroup, isHotelsColumn: boolean) => {
    const visibleLimit = isHotelsColumn ? 14 : 999;
    const visibleLinks = g.links.slice(0, visibleLimit);
    const hasMore = g.links.length > visibleLimit;

    return (
      <div key={g.title} className="mb-3 last:mb-0">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#E3A312]">
            {g.title}
          </p>
          {isHotelsColumn && g.links.length > 0 && (
            <span className="rounded-full bg-[#E8F5F8] px-2 py-0.5 text-[10px] font-bold text-[#0A7C95]">
              {g.links.length}
            </span>
          )}
        </div>

        <ul className="scrollbar-thin max-h-[40vh] overflow-y-auto pr-1">
          {visibleLinks.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                onClick={closeAll}
                className="block rounded-lg px-2 py-2.5 text-sm font-medium text-[#06303A] hover:bg-[#E8F5F8]"
              >
                {l.label}
              </Link>
            </li>
          ))}

          {isHotelsColumn &&
            g.title === "Tous nos hôtels" &&
            g.links.length === 0 &&
            hotelsStatus === "ready" && (
              <li className="px-2 py-2 text-sm text-gray-500">
                {hotelSearch.trim()
                  ? `Aucun hôtel ne correspond à « ${hotelSearch.trim()} ».`
                  : "Aucun hôtel disponible."}
              </li>
            )}
        </ul>

        {hasMore && (
          <Link
            to="/hotels-tunisie"
            onClick={closeAll}
            className="mt-1 block px-2 py-2 text-sm font-bold text-[#0A7C95] hover:underline"
          >
            Voir les {g.links.length} résultats →
          </Link>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ====================== TOP BAR ====================== */}
      <div className="relative z-30 border-b border-[#D9A21B]/40 bg-[#064B5C] text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-3 py-1.5 sm:px-6 lg:px-8">
          <a
            href={PHONE_HREF}
            className="flex items-center gap-1.5 text-[11px] font-semibold hover:underline sm:text-sm"
          >
            <Phone className="h-3.5 w-3.5 text-[#F2B705]" aria-hidden="true" />
            <span>{PHONE_DISPLAY}</span>
          </a>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-white/80 sm:flex">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="transition-colors hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>

      
          </div>
        </div>
      </div>

      {/* ====================== HEADER ====================== */}
      <header
        ref={headerRef}
        className={`sticky top-0 z-40 bg-white/95 backdrop-blur transition-shadow ${
          scrolled ? "shadow-md" : "border-b border-gray-200/70"
        }`}
      >
        <nav
          className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-3 sm:h-16 sm:px-6 lg:h-20 lg:px-8"
          aria-label="Navigation principale"
        >
          {/* Logo */}
          <Link
            to="/"
            onClick={closeAll}
            className="flex shrink-0 items-center gap-2"
            aria-label="Seif Tours, accueil"
          >
            <img
              src="/logoseif.png"
              alt=""
              className="h-9 w-auto lg:h-11"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <span className="text-base font-extrabold tracking-tight text-[#064B5C] sm:text-lg lg:text-xl">
              Seif Tours
            </span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-0.5 lg:flex">
            {items.map((it) => (
              <li
                key={it.key}
                className="relative"
                onMouseEnter={it.groups ? () => hoverOpen(it.key) : undefined}
                onMouseLeave={it.groups ? hoverClose : undefined}
              >
                {it.groups ? (
                  <>
                    <button
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={open === it.key}
                      onClick={() => {
                        setOpen(open === it.key ? null : it.key);
                        if (it.key === "hotels") loadHotels();
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors xl:px-3 xl:text-sm ${
                        isActive(it.to) || open === it.key
                          ? "text-[#0A7C95]"
                          : "text-[#06303A] hover:text-[#0A7C95]"
                      }`}
                    >
                      {it.label}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          open === it.key ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {open === it.key && (
                      <div
                        className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 ${
                          it.groups.length > 1
                            ? "w-[720px] max-w-[calc(100vw-2rem)]"
                            : "w-64"
                        }`}
                      >
                        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xl shadow-[#064B5C]/10">
                          {/* Recherche (hôtels) */}
                          {it.key === "hotels" && (
                            <div className="border-b border-gray-100 p-3">
                              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-[#0A7C95] focus-within:ring-1 focus-within:ring-[#0A7C95]">
                                <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                                <input
                                  type="search"
                                  value={hotelSearch}
                                  onChange={(e) => setHotelSearch(e.target.value)}
                                  placeholder="Rechercher un hôtel ou une ville"
                                  aria-label="Rechercher un hôtel"
                                  className="w-full min-w-0 bg-transparent text-sm outline-none"
                                />
                              </label>
                            </div>
                          )}

                          <div
                            className={`grid gap-6 p-5 ${
                              it.groups.length > 1 ? "grid-cols-2" : "grid-cols-1"
                            }`}
                          >
                            {it.groups.map((g) =>
                              renderDesktopGroup(g, it.key === "hotels")
                            )}
                          </div>

                          {it.all && (
                            <Link
                              to={it.all.to}
                              onClick={closeAll}
                              className="block border-t border-gray-100 bg-[#F2F9FB] px-5 py-3 text-sm font-bold text-[#064B5C] hover:text-[#0A7C95]"
                            >
                              {it.all.label} →
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={it.to}
                    onClick={closeAll}
                    className={({ isActive: a }) =>
                      `inline-flex items-center rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors xl:px-3 xl:text-sm ${
                        a ? "text-[#0A7C95]" : "text-[#06303A] hover:text-[#0A7C95]"
                      }`
                    }
                  >
                    {it.label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>

          {/* Right: phone CTA + burger */}
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={PHONE_HREF}
              className="hidden items-center gap-2 rounded-full bg-[#E3A312] px-4 py-2 text-sm font-bold text-[#06303A] shadow-sm transition-colors hover:bg-[#F2B705] lg:inline-flex"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">{PHONE_DISPLAY}</span>
              <span className="xl:hidden">Appeler</span>
            </a>

            <a
              href={PHONE_HREF}
              aria-label={`Appeler ${PHONE_DISPLAY}`}
              className="rounded-full bg-[#E3A312] p-2 text-[#06303A] lg:hidden"
            >
              <Phone className="h-5 w-5" />
            </a>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#064B5C] hover:bg-[#E8F5F8] lg:hidden"
              aria-label={drawer ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={drawer}
              aria-controls="mobile-menu"
              onClick={() => setDrawer((v) => !v)}
            >
              {drawer ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* ====================== TIROIR MOBILE (hors du header) ====================== */}
      {drawer && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          id="mobile-menu"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/50"
            onClick={closeAll}
          />
          {/* Panel */}
          <div className="absolute inset-y-0 right-0 flex h-full w-[88%] max-w-sm flex-col bg-white shadow-2xl">
            {/* Header du tiroir */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          
              <button
                type="button"
                onClick={closeAll}
                aria-label="Fermer le menu"
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corps scrollable */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <ul className="space-y-1">
                {items.map((it) => (
                  <li key={it.key}>
                    {it.groups ? (
                      <>
                        <button
                          type="button"
                          aria-expanded={mobileOpen === it.key}
                          onClick={() => {
                            setMobileOpen(mobileOpen === it.key ? null : it.key);
                            if (it.key === "hotels") loadHotels();
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[15px] font-bold text-[#06303A] hover:bg-[#E8F5F8]"
                        >
                          <span className="flex items-center gap-2">
                            {it.key === "hotels" && (
                              <HotelIcon className="h-4 w-4 text-[#0A7C95]" />
                            )}
                            {it.label}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform ${
                              mobileOpen === it.key ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {mobileOpen === it.key && (
                          <div className="mb-2 ml-2 space-y-3 border-l-2 border-[#E8F5F8] pl-3">
                            {/* Recherche (hôtels) */}
                            {it.key === "hotels" && (
                              <label className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                                <Search className="h-4 w-4 text-gray-400" />
                                <input
                                  type="search"
                                  value={hotelSearch}
                                  onChange={(e) => setHotelSearch(e.target.value)}
                                  placeholder="Rechercher un hôtel…"
                                  aria-label="Rechercher un hôtel"
                                  className="w-full min-w-0 bg-transparent text-sm outline-none"
                                />
                              </label>
                            )}

                            {it.key === "hotels" && hotelsLoading && (
                              <p className="px-2 py-1 text-sm text-gray-500">
                                Chargement…
                              </p>
                            )}
                            {it.key === "hotels" && hotelsError && (
                              <p className="px-2 py-1 text-sm text-red-600">
                                Impossible de charger les hôtels.
                              </p>
                            )}

                            {it.groups.map((g) =>
                              renderMobileGroup(g, it.key === "hotels")
                            )}

                            {it.all && (
                              <Link
                                to={it.all.to}
                                onClick={closeAll}
                                className="block px-2 py-2 text-sm font-bold text-[#0A7C95]"
                              >
                                {it.all.label} →
                              </Link>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <NavLink
                        to={it.to}
                        onClick={closeAll}
                        className={({ isActive: a }) =>
                          `flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-bold hover:bg-[#E8F5F8] ${
                            a ? "text-[#0A7C95]" : "text-[#06303A]"
                          }`
                        }
                      >
                        {it.label}
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer du tiroir : CTA */}
            <div className="border-t border-gray-100 px-3 py-3">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={PHONE_HREF}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#0A7C95] px-3 py-2.5 text-sm font-semibold text-white"
                >
                  <Phone className="h-4 w-4" /> Appeler
                </a>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}