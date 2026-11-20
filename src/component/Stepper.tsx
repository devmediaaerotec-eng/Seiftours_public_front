import { useId } from "react";
import { Minus, Plus } from "lucide-react";

interface Props {
  label: string;
  /** Small line under the label, e.g. "18 ans et plus" */
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Focus target for form errors */
  id?: string;
  error?: string;
}

/** "Label  [−] 2 [+]" row, shared by the hotel and flight forms. */
export default function Stepper({ label, hint, value, min, max, onChange, id, error }: Props) {
  const auto = useId();
  const labelId = `${id ?? auto}-label`;
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand-600/30 bg-white text-brand-800 transition hover:border-brand-600 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-white";
  return (
    <div>
      <div
        id={id}
        tabIndex={id ? -1 : undefined}
        role="group"
        aria-labelledby={labelId}
        className="flex items-center justify-between gap-3 py-2 outline-none"
      >
        <span id={labelId} className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900">{label}</span>
          {hint && <span className="block text-xs text-gray-500">{hint}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            className={btn}
            disabled={value <= min}
            onClick={() => onChange(Math.max(min, value - 1))}
            aria-label={`${label} −1`}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <output className="w-6 text-center text-base font-extrabold text-gray-900" aria-live="polite">
            {value}
          </output>
          <button
            type="button"
            className={btn}
            disabled={value >= max}
            onClick={() => onChange(Math.min(max, value + 1))}
            aria-label={`${label} +1`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </span>
      </div>
      {error && (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
