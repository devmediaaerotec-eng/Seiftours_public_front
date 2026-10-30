import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? ""; // vide = même domaine (proxy Vite en dev)
export interface TripAttributes {
  stops?: string[];        // circuits : étapes
  highlights?: string[];   // circuits : points forts
  group_size?: string;     // circuits : « 8 à 12 personnes »
  [key: string]: unknown;  // autres champs (omra, voyages organisés…)
}
export interface TripCard {
  id: number;
  slug: string;
  type: "omra" | "organized" | "circuit";
  title: string;
  summary: string | null;
  destination: string | null;
  image_url: string | null;
  duration_nights: number;
  duration: string;
  currency: string;
  new_price: number | null;   // dinars ; null = « sur devis »
  old_price: number | null;
  inclusions: string[];
  departure_dates: string[];  // ISO "2026-12-01"
  is_featured: boolean;
  badge: string | null;
  attributes?: TripAttributes;
  
}

export function usePublicTrips(params: Record<string, string> = {}) {
  const [data, setData] = useState<TripCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const query = new URLSearchParams(params).toString();

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`${API}/api/public/trips?${query}`, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((j) => setData(j.items ?? []))
      .catch((e) => { if (e.name !== "AbortError") setError(e); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [query, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, loading, error, retry };
}

export interface TripDeparture {
  id: number;
  departure_date: string;          // ISO
  return_date: string | null;
  price: number | null;            // dinars / personne
  single_supplement: number | null;
  child_price: number | null;
  seats_left: number | null;
}
export interface TripDetailData {
  id: number;
  type: "omra" | "organized" | "circuit";
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  destination: string | null;
  departure_city: string;
  duration_nights: number;
  image_url: string | null;
  currency: string;
  new_price: number | null;
  old_price: number | null;
  inclusions: string[];
  exclusions: string[];
  days: { day_number: number; title: string; description: string | null }[];
  images: { url: string; alt: string | null }[];
  departures: TripDeparture[];
}

/** Fiche d'un voyage par son slug. `notFound` = 404 (voyage inexistant ou masqué). */
export function usePublicTrip(slug: string | undefined) {
  const [data, setData] = useState<TripDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const ctrl = new AbortController();
    setLoading(true); setError(null); setNotFound(false); setData(null);
    fetch(`${API}/api/public/trips/${encodeURIComponent(slug)}`, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((j) => { if (j) setData(j); })
      .catch((e) => { if (e.name !== "AbortError") setError(e); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [slug, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, loading, error, notFound, retry };
}