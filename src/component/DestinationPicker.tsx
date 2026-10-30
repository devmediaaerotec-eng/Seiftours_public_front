import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Search, Check, ChevronDown } from "lucide-react";

export interface DestinationOption {
  name: string;
  count: number;
}

interface DestinationPickerProps {
  /** Selected destination name, "" = all destinations */
  value: string;
  options: DestinationOption[];
  /** Total number of hotels, shown next to "all destinations" */
  totalCount: number;
  onChange: (name: string) => void;
  loading?: boolean;
  label?: string;
  allLabel?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  countHeader?: string;
  className?: string;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function DestinationPicker({
  value,
  options,
  totalCount,
  onChange,
  loading = false,
  label = "Destination",
  allLabel = "Toutes les destinations",
  searchPlaceholder = "Rechercher une destination",
  emptyLabel = "Aucune destination trouvée",
  countHeader = "Hôtels",
  className = "",
}: DestinationPickerProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rows: "all destinations" first (only when not searching), then the matching cities
  const items = useMemo(() => {
    const q = norm(query);
    const rows = (q ? options.filter((o) => norm(o.name).includes(q)) : options).map((o) => ({
      name: o.name,
      label: o.name,
      count: o.count,
    }));
    return q ? rows : [{ name: "", label: allLabel, count: totalCount }, ...rows];
  }, [options, query, allLabel, totalCount]);

  const selected = options.find((o) => o.name === value);

  /* ------------------------------ open / close ----------------------------- */
  const openPanel = () => {
    setQuery("");
    setOpen(true);
  };

  const closePanel = (focusButton = false) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  const select = (name: string) => {
    onChange(name);
    closePanel(true);
  };

  // On open: highlight the current choice and focus the search field
  useEffect(() => {
    if (!open) return;
    const idx = items.findIndex((i) => i.name === value);
    setActive(idx >= 0 ? idx : 0);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Typing narrows the list: start again from the first row
  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the highlighted row visible when navigating with the keyboard
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault(); // do not submit the surrounding search form
        if (items[active]) select(items[active].name);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        closePanel(true);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openPanel();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`flex w-full items-center gap-3 rounded-xl border bg-white px-3.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]/30 ${
          open ? "border-[#0A7C95] ring-2 ring-[#0A7C95]/20" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <MapPin className="h-5 w-5 shrink-0 text-[#0A7C95]" aria-hidden="true" />
        <span className="block min-w-0 flex-1">
          <span className="block text-[11px] font-medium leading-4 text-gray-500">{label}</span>
          <span className="block truncate text-[15px] font-medium text-gray-900">
            {value || allLabel}
          </span>
        </span>
        {selected && (
          <span
            className="shrink-0 rounded-full bg-[#E8F5F8] px-2 py-0.5 text-xs font-semibold text-[#0A7C95]"
            title={`${selected.count} hôtel${selected.count > 1 ? "s" : ""}`}
          >
            {selected.count}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[300px] rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 focus-within:ring-2 focus-within:ring-[#0A7C95]/25">
            <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={items[active] ? optionId(active) : undefined}
              aria-label={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="mt-2 flex justify-between px-3 text-[11px] font-medium uppercase tracking-wide text-gray-400">
            <span>{label}</span>
            <span>{countHeader}</span>
          </div>

          <ul id={listId} role="listbox" aria-label={label} className="mt-1 max-h-72 overflow-y-auto">
            {loading && options.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="px-3 py-2.5">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                </li>
              ))
            ) : items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-500">{emptyLabel}</li>
            ) : (
              items.map((item, i) => {
                const isSelected = item.name === value;
                const isActive = i === active;
                return (
                  <li
                    key={item.name || "__all__"}
                    id={optionId(i)}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(item.name)}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive ? "bg-[#E8F5F8]" : ""
                    } ${isSelected ? "font-semibold text-[#0A7C95]" : "text-gray-800"}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <MapPin
                        className={`h-4 w-4 shrink-0 ${isSelected ? "text-[#0A7C95]" : "text-gray-300"}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {isSelected && <Check className="h-4 w-4 text-[#0A7C95]" aria-hidden="true" />}
                      <span
                        className={`min-w-[2rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold ${
                          isSelected ? "bg-white text-[#0A7C95]" : "bg-gray-100 text-gray-600"
                        }`}
                        title={`${item.count} hôtel${item.count > 1 ? "s" : ""}`}
                      >
                        {item.count}
                      </span>
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}