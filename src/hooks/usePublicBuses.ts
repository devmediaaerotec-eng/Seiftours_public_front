import { useCallback, useEffect, useRef, useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
export interface PublicBus {
  id: string;
  code: string;
  name: string;
  vehicle_type: string;
  image_url: string | null;
  seats: number;
  transmission: string;
  features: string[];
  price_per_day: number;
  notes?: string | null;
}

interface UsePublicBusesResult {
  data: PublicBus[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */
export function usePublicBuses(params?: {
  type?: "minibus" | "microbus";
  minSeats?: number;
}): UsePublicBusesResult {
  const [data, setData] = useState<PublicBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.minSeats) qs.set("min_seats", String(params.minSeats));

    const url = `/api/public/buses${qs.toString() ? `?${qs.toString()}` : ""}`;

    fetch(url, { headers: { Accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: { items?: PublicBus[] }) => {
        if (cancelled || !mountedRef.current) return;
        setData(Array.isArray(json.items) ? json.items : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || !mountedRef.current) return;
        console.error("[usePublicBuses]", err);
        setError("Impossible de charger la flotte.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params?.type, params?.minSeats, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { data, loading, error, retry };
}