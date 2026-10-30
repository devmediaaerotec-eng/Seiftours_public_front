import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

/** GET JSON générique : { data, loading, error, retry }. */
function useJson<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setError(null);
    fetch(`${API}${path}`, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then((r) => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.json(); })
      .then((j) => setData(j))
      .catch((e) => { if (e.name !== "AbortError") setError(e); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [path, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, loading, error, retry };
}

/* ------------------------------- Catégories ------------------------------- */
export interface CategoryStat { count: number; from: number | null }
export type CategoryStats = Record<"hotels" | "circuits" | "organized" | "omra", CategoryStat>;

export const useHomeCategories = () => useJson<CategoryStats>("/api/public/home/categories");

/* ------------------------------- Destinations ------------------------------ */
export interface HomeDestination {
  slug: string;
  name: string;
  country: string | null;
  tagline: string | null;
  image_url: string | null;
  tours: number;
  from: number | null;
  featured: boolean;
}

export function useHomeDestinations(lang: "fr" | "en", limit = 4) {
  const r = useJson<{ items: HomeDestination[] }>(`/api/public/home/destinations?lang=${lang}&limit=${limit}`);
  return { ...r, items: r.data?.items ?? [] };
}

/* ------------------------------- Chiffres clés ------------------------------ */
export interface HomeStats {
  destinations: number;
  trips: number;
  hotels: number;
  clients: string | null;   // réglage « stat_clients », texte libre ("50K+")
  years: string | null;     // réglage « stat_experience_years »
}
export const useHomeStats = () => useJson<HomeStats>("/api/public/home/stats");