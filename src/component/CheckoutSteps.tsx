import { Check } from "lucide-react";

const STEPS = ["Votre sélection", "Vos coordonnées", "Confirmation"] as const;

/** current: 1..3 = step in progress, 4 = everything is done */
export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol aria-label="Étapes de la réservation" className="flex items-center gap-3 sm:gap-4">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex flex-1 items-center gap-3 last:flex-none sm:gap-4"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                done
                  ? "bg-[#0A7C95] text-white"
                  : active
                    ? "border-2 border-[#0A7C95] bg-white text-[#0A7C95]"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : n}
            </span>
            <span
              className={`whitespace-nowrap text-sm font-semibold sm:text-base ${
                active ? "text-gray-900" : done ? "text-gray-700" : "sr-only text-gray-400 sm:not-sr-only"
              }`}
            >
              {label}
            </span>
            {n < STEPS.length && (
              <span aria-hidden="true" className={`h-px flex-1 ${done ? "bg-[#0A7C95]" : "bg-gray-300"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
