import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

export interface Deal {
  id: number;
  title: string;
  description: string | null;
  category: string;            // slug
  category_name: string;
  location: string | null;
  nights: number | null;
  image_url: string | null;
  price: number | null;        // dinars (null = sur devis)
  old_price: number | null;
  currency: string;
  discount_percent: number | null;
  discount_label: string | null;
  valid_until: string | null;  // "2026-12-31"
  featured: boolean;
  to: string;                  // fiche du bon plan : /bons-plans/:id
}
export interface DealDetail extends Deal {
  target: string | null;       // réserver (voyage), fiche hôtel ou lien libre ; null = formulaire de contact
  trip_to: string | null;      // programme du voyage / fiche hôtel ; null = offre libre
}
export interface DealCategory { slug: string; name: string; count: number }

export function useDeals(lang: "fr" | "en") {
  const [data, setData] = useState<{ categories: DealCategory[]; items: Deal[]; updated_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setError(null);
    fetch(`${API}/api/public/deals?lang=${lang}`, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then((r) => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => { if (e.name !== "AbortError") setError(e); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [lang, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { categories: data?.categories ?? [], items: data?.items ?? [], updatedAt: data?.updated_at ?? null, loading, error, retry };
}

export function useDeal(id: string | undefined, lang: "fr" | "en") {
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true); setError(null); setNotFound(false);
    fetch(`${API}/api/public/deals/${encodeURIComponent(id)}?lang=${lang}`, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((d) => setDeal(d))
      .catch((e) => { if (e.name !== "AbortError") setError(e); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [id, lang, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { deal, loading, error, notFound, retry };
}
