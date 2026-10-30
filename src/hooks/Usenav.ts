import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

export interface NavLinkData { slug: string; name: string }
export interface NavData {
  destinations: NavLinkData[];
  regions: NavLinkData[];
  deal_categories: NavLinkData[];
}

/** Repli : le menu n'est jamais vide, même si l'API est hors ligne. */
export const NAV_FALLBACK: NavData = {
  destinations: [
    { slug: "bali", name: "Bali" },
    { slug: "istanbul", name: "Turquie — Istanbul" },
    { slug: "antalya", name: "Turquie — Antalya" },
    { slug: "egypte", name: "Égypte" },
    { slug: "casablanca", name: "Maroc — Casablanca" },
    { slug: "dubai", name: "Dubaï" },
  ],
  regions: [
    { slug: "nord", name: "Circuit Nord" },
    { slug: "sud", name: "Circuit Sud" },
  ],
  deal_categories: [],
};

let cache: NavData | null = null;     // partagé entre les composants et les navigations
let inflight: Promise<NavData> | null = null;

function load(): Promise<NavData> {
  inflight ??= fetch(`${API}/api/public/nav`, { headers: { Accept: "application/json" } })
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((j): NavData => (cache = {
      destinations: j.destinations ?? [],
      regions: j.regions ?? [],
      deal_categories: j.deal_categories ?? [],
    }))
    .finally(() => { inflight = null; });
  return inflight;
}

export function useNav(): NavData {
  const [data, setData] = useState<NavData>(cache ?? NAV_FALLBACK);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    load().then((d) => alive && setData(d)).catch(() => { /* on garde le repli */ });
    return () => { alive = false; };
  }, []);
  return data;
}