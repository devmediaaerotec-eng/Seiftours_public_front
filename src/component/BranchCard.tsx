import { ChevronDown, MapPin, Navigation, Phone } from "lucide-react";
import { DAY_LABELS, directionsUrl, hoursLabel, openStatus, tunisNow, type Branch } from "@/lib/branches";

/** Address, phone, open/closed now, weekly hours and directions of one agency. */
function BranchDetails({ branch }: { branch: Branch }) {
  const status = openStatus(branch);
  const today = tunisNow().day; // Tunisian time, same as the open/closed text

  return (
    <div className="space-y-2 text-sm text-gray-600">
      <p className="flex items-start gap-1.5">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {branch.address}
      </p>
      {branch.phone && (
        <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-[#0A7C95]">
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          {branch.phone}
        </a>
      )}
      <p className={`flex items-center gap-2 font-semibold ${status.open ? "text-emerald-700" : "text-[#8A5A00]"}`}>
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${status.open ? "bg-emerald-600" : "bg-[#E3A312]"}`}
        />
        {status.text}
      </p>

      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-semibold text-gray-900 underline">
          Voir horaires
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="mt-2 space-y-0.5">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <li key={d} className={`flex justify-between gap-6 ${d === today ? "font-bold text-gray-900" : ""}`}>
              <span>{DAY_LABELS[d]}</span>
              <span>{hoursLabel(branch.hours[d])}</span>
            </li>
          ))}
        </ul>
      </details>

      <a
        href={directionsUrl(branch)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-semibold text-[#0A7C95] hover:underline"
      >
        <Navigation className="h-4 w-4" aria-hidden="true" />
        Obtenir l'itinéraire
      </a>
    </div>
  );
}

/** Selectable agency (checkout page). */
export function BranchOption({
  branch,
  selected,
  onSelect,
  id,
}: {
  branch: Branch;
  selected: boolean;
  onSelect: () => void;
  id?: string;
}) {
  const inputId = id ?? `branch-${branch.id}`;
  return (
    <div
      className={`rounded-2xl border-2 p-4 transition ${
        selected ? "border-[#0A7C95] bg-[#E8F5F8]/60" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <label htmlFor={inputId} className="flex cursor-pointer items-center gap-3">
        <input
          id={inputId}
          type="radio"
          name="branch"
          checked={selected}
          onChange={onSelect}
          className="h-4 w-4 shrink-0 accent-[#0A7C95]"
        />
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-[#0A7C95] shadow-sm"
        >
          {branch.city.slice(0, 2).toUpperCase()}
        </span>
        <span className="text-base font-bold text-gray-900">{branch.name}</span>
      </label>
      <div className="mt-3 pl-7 sm:pl-[3.25rem]">
        <BranchDetails branch={branch} />
      </div>
    </div>
  );
}

/** Read-only agency (confirmation page). */
export function BranchInfo({ branch }: { branch: Branch }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-3 text-lg font-bold text-gray-900">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F5F8] text-sm font-extrabold text-[#0A7C95]"
        >
          {branch.city.slice(0, 2).toUpperCase()}
        </span>
        {branch.name}
      </p>
      <BranchDetails branch={branch} />
    </div>
  );
}
