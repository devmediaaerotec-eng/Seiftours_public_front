import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

export interface BestSeller {
  id: string;
  kind: "hotel" | "omra" | "organized" | "circuit";
  category: string | null;          // nom de la catégorie de bon plan, sinon null
  title: string;
  location: string | null;
  image_url: string | null;
  price: number | null;             // dinars
  old_price: number | null;
  currency: string;
  nights: number | null;
  discount: string | null;
  to: string;
}

export function useBestSellers(lang: "fr" | "en", limit = 6) {
  const [items, setItems] = useState<BestSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setError(null);
    fetch(`${API}/api/public/best-sellers?lang=${lang}&limit=${limit}`, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then((r) => { if (!r.ok) throw new Error(`Erreur ${r.status}`); return r.json(); })
      .then((j) => setItems(j.items ?? []))
      .catch((e) => { if (e.name !== "AbortError") setError(e); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [lang, limit, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { items, loading, error, retry };
}