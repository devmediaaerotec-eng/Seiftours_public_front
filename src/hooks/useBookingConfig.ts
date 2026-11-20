import { useQuery } from "@tanstack/react-query";
import { bookingApi } from "@/lib/Bookingapi";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/Payment";

/**
 * Markup + deposit rules from the API. Returns the defaults while loading or if the API is down:
 * the server re-checks every price at booking time anyway.
 */
export function useBookingConfig(hotelId?: number, checkIn?: string): PricingConfig {
  const { data } = useQuery({
    queryKey: ["booking-config", hotelId ?? 0, checkIn ?? ""],
    queryFn: () => bookingApi.config(hotelId, checkIn),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  return data ?? DEFAULT_PRICING;
}
