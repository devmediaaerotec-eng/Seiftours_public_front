/**
 * Flight reservation requests (POST /api/public/flight-requests, Symfony API).
 * There is no flight search API: the request is saved and the agency calls the visitor back
 * with the available flights and their prices.
 */
const API = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export type TripType = "return" | "oneway";
export type CabinClass = "economy" | "premium" | "business" | "first";

export const CABIN_LABELS: Record<CabinClass, string> = {
  economy: "Économique",
  premium: "Premium économique",
  business: "Affaires",
  first: "Première",
};

export interface FlightRequestPayload {
  trip_type: TripType;
  from_place: string;
  to_place: string;
  depart_date: string; // YYYY-MM-DD
  return_date?: string;
  adults: number;
  children: number;
  infants: number;
  cabin_class: CabinClass;
  flexible_dates: boolean;
  direct_only: boolean;
  checked_bags: number;
  preferred_airline?: string;
  message?: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  /** Optional preferred agency ("sousse" | "jemmal") */
  branch?: string;
  /** Honeypot: must stay empty */
  website: string;
}

export class FlightRequestError extends Error {
  status: number;
  violations?: Record<string, string>;
  constructor(message: string, status: number, violations?: Record<string, string>) {
    super(message);
    this.name = "FlightRequestError";
    this.status = status;
    this.violations = violations;
  }
}

export async function submitFlightRequest(payload: FlightRequestPayload): Promise<{ reference: string }> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/public/flight-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new FlightRequestError("Connexion impossible. Vérifiez votre réseau et réessayez.", 0);
  }

  let body: { reference?: string; message?: string; violations?: Record<string, string> } | null = null;
  try {
    body = await res.json();
  } catch {
    /* empty answer */
  }
  if (!res.ok || !body?.reference) {
    throw new FlightRequestError(body?.message ?? "L'envoi a échoué. Réessayez ou appelez-nous.", res.status, body?.violations);
  }
  return { reference: body.reference };
}
