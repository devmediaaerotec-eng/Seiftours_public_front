import { useCallback, useEffect, useState } from "react";

const API = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const ASSETS = (import.meta.env.VITE_ASSET_BASE as string | undefined) ?? "";

export type BusType = "minibus" | "microbus";
export type Vehicle = "any" | BusType;
export type Purpose = "wedding" | "excursion" | "airport" | "school" | "seminar" | "circuit" | "other";

export interface FleetBus {
  id: number;
  bus_type: BusType;
  brand: string | null;
  model: string | null;
  seats: number;
  year_made: number | null;
  image_url: string | null;
}
export interface TypeSummary {
  count: number;
  min_seats: number | null;
  max_seats: number | null;
}
export interface PublicFleet {
  buses: FleetBus[];
  summary: Record<BusType, TypeSummary>;
}

/** Les images envoyées depuis l'administration sont des chemins relatifs (/uploads/...). */
export const assetUrl = (u?: string | null) => (!u ? "" : /^https?:\/\//.test(u) ? u : `${ASSETS}${u}`);

export function usePublicFleet() {
  const [data, setData] = useState<PublicFleet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`${API}/api/public/fleet`, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<PublicFleet>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setError(true);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, loading, error, retry };
}

export interface TransportRequestPayload {
  vehicle_pref: Vehicle;
  purpose: Purpose;
  pax: number;
  starts_at: string; // "2026-11-20 08:00"
  ends_at: string;
  pickup_place: string;
  destination: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  message: string;
  website: string; // champ piège anti-spam : doit rester vide
}

export class TransportRequestError extends Error {
  status: number;
  violations?: Record<string, string>;
  constructor(message: string, status: number, violations?: Record<string, string>) {
    super(message);
    this.status = status;
    this.violations = violations;
  }
}

export async function submitTransportRequest(payload: TransportRequestPayload): Promise<{ reference: string }> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/public/transport-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new TransportRequestError("Connexion impossible. Vérifiez votre réseau et réessayez.", 0);
  }

  let body: { reference?: string; message?: string; violations?: Record<string, string> } | null = null;
  try {
    body = await res.json();
  } catch {
    /* réponse vide */
  }
  if (!res.ok || !body?.reference) {
    throw new TransportRequestError(body?.message ?? "L'envoi a échoué. Réessayez ou appelez-nous.", res.status, body?.violations);
  }
  return { reference: body.reference };
}