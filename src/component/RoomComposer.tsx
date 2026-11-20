import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { BedDouble, ChevronDown, Plus, Users, X } from "lucide-react";
import Stepper from "@/components/Stepper";

import type { RoomConfig } from "@/lib/booking";
export type { RoomConfig };

interface Props {
  rooms: RoomConfig[];
  onChange: (rooms: RoomConfig[]) => void;
}

export function roomSummary(rooms: RoomConfig[]): string {
  const totalRooms = rooms.length;
  const totalAdults = rooms.reduce((s, r) => s + r.adults, 0);
  const totalChildren = rooms.reduce((s, r) => s + r.children, 0);
  return [
    `${totalRooms} chambre${totalRooms > 1 ? "s" : ""}`,
    `${totalAdults} adulte${totalAdults > 1 ? "s" : ""}`,
    ...(totalChildren > 0
      ? [`${totalChildren} enfant${totalChildren > 1 ? "s" : ""}`]
      : []),
  ].join(" · ");
}

export default function RoomComposer({ rooms, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHost, setSheetHost] = useState<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (!containerRef.current?.contains(t) && !sheetRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function updateRoom(i: number, patch: Partial<RoomConfig>) {
    onChange(
      rooms.map((r, idx) => {
        if (idx !== i) return r;
        // Copy the ages: pushing into the old array would mutate React state
        const next = { ...r, ...patch, childrenAges: [...(patch.childrenAges ?? r.childrenAges)] };
        // Keep childrenAges in sync with children count
        while (next.childrenAges.length < next.children) next.childrenAges.push(5);
        while (next.childrenAges.length > next.children) next.childrenAges.pop();
        return next;
      })
    );
  }

  function addRoom() {
    onChange([...rooms, { adults: 2, children: 0, childrenAges: [] }]);
  }

  function removeRoom(i: number) {
    onChange(rooms.filter((_, idx) => idx !== i));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex w-full items-center gap-3 rounded-xl border bg-white px-3.5 py-2 text-left transition hover:border-brand-600/60 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 ${
          open ? "border-brand-600 ring-2 ring-brand-600/20" : "border-gray-300"
        }`}
      >
        <Users className="h-5 w-5 shrink-0 text-brand-800" aria-hidden="true" />
        <span className="block min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase leading-4 tracking-wide text-gray-500">Chambres &amp; voyageurs</span>
          <span className="block truncate text-[15px] font-semibold text-gray-900">{roomSummary(rooms)}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div ref={setSheetHost} />
      {open && sheetHost && createPortal(
        <>
          <div className="fixed inset-0 z-[60] bg-brand-900/40 sm:hidden" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            ref={sheetRef}
            role="dialog"
            aria-label="Chambres et voyageurs"
            className="fixed inset-x-0 bottom-0 z-[70] sm:z-50 max-h-[88vh] space-y-3 overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[70vh] sm:w-[22rem] sm:rounded-2xl sm:border sm:border-gray-100"
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" aria-hidden="true" />
            {rooms.map((room, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-extrabold text-brand-800">
                    <BedDouble className="h-4 w-4" aria-hidden="true" />
                    Chambre {i + 1}
                  </span>
                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRoom(i)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Supprimer la chambre ${i + 1}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" /> Retirer
                    </button>
                  )}
                </div>

                <Stepper label="Adultes" hint="18 ans et plus" value={room.adults} min={1} max={10}
                         onChange={(v) => updateRoom(i, { adults: v })} />
                <Stepper label="Enfants" hint="0 à 17 ans" value={room.children} min={0} max={6}
                         onChange={(v) => updateRoom(i, { children: v })} />

                {room.children > 0 && (
                  <div className="mt-2 border-t border-gray-200 pt-3">
                    <p className="mb-2 text-xs font-semibold text-gray-600">
                      Âge des enfants à la date du séjour (le prix en dépend)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {room.childrenAges.map((age, j) => (
                        <label key={j} className="block">
                          <span className="mb-0.5 block text-[11px] text-gray-500">Enfant {j + 1}</span>
                          <select
                            value={age}
                            onChange={(e) => {
                              const ages = [...room.childrenAges];
                              ages[j] = parseInt(e.target.value, 10);
                              updateRoom(i, { childrenAges: ages });
                            }}
                            className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                          >
                            {Array.from({ length: 18 }, (_, k) => (
                              <option key={k} value={k}>
                                {k === 0 ? "- 1 an" : `${k} an${k !== 1 ? "s" : ""}`}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addRoom}
              disabled={rooms.length >= 5}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-600/40 py-2.5 text-sm font-bold text-brand-600 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter une chambre
              <span className="font-normal text-gray-500">(5 max.)</span>
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-brand-800 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              Valider · {roomSummary(rooms)}
            </button>
          </div>
        </>,
        // Mobile: render on <body> so the sheet escapes the form's stacking context (it covers the whole screen)
        isMobile ? document.body : sheetHost
      )}
    </div>
  );
}
