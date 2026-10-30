import { useState, useRef, useEffect } from "react";
import { Users, Plus, Minus, X, ChevronDown } from "lucide-react";

import type { RoomConfig } from "@/lib/booking";
export type { RoomConfig };

interface Props {
  rooms: RoomConfig[];
  onChange: (rooms: RoomConfig[]) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
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

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
        className="flex w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-left transition focus-visible:border-[#0A7C95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]/20"
      >
        <Users className="h-5 w-5 shrink-0 text-[#064B5C]" aria-hidden="true" />
        <span className="block min-w-0 flex-1">
          <span className="block text-[11px] font-medium leading-4 text-gray-500">Chambres &amp; voyageurs</span>
          <span className="block truncate text-[15px] font-medium text-gray-900">{roomSummary(rooms)}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Chambres et voyageurs"
          className="absolute z-50 top-full mt-2 right-0 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 space-y-4"
        >
          {rooms.map((room, i) => (
            <div key={i}>
              {i > 0 && <div className="border-t border-gray-100 mb-4" />}

              {/* Room header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-800">Chambre {i + 1}</span>
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoom(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Supprimer cette chambre"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Adults */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Adultes</p>
                  <p className="text-xs text-gray-400">18 ans et plus</p>
                </div>
                <Counter
                  value={room.adults}
                  min={1}
                  max={10}
                  onChange={(v) => updateRoom(i, { adults: v })}
                />
              </div>

              {/* Children */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Enfants</p>
                  <p className="text-xs text-gray-400">0 – 17 ans</p>
                </div>
                <Counter
                  value={room.children}
                  min={0}
                  max={6}
                  onChange={(v) => updateRoom(i, { children: v })}
                />
              </div>

              {/* Children ages */}
              {room.children > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Âge des enfants
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {room.childrenAges.map((age, j) => (
                      <div key={j}>
                        <label className="text-[10px] text-gray-400 mb-0.5 block">
                          Enfant {j + 1}
                        </label>
                        <select
                          value={age}
                          onChange={(e) => {
                            const ages = [...room.childrenAges];
                            ages[j] = parseInt(e.target.value, 10);
                            updateRoom(i, { childrenAges: ages });
                          }}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A7C95]/30 focus:border-[#0A7C95] bg-white"
                        >
                          {Array.from({ length: 18 }, (_, k) => (
                            <option key={k} value={k}>
                              {k} an{k !== 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
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
            className="w-full py-2 border border-dashed border-[#0A7C95]/40 text-[#0A7C95] text-sm font-medium rounded-xl hover:bg-[#E8F5F8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Ajouter une chambre
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-2 bg-[#064B5C] hover:bg-[#0A7C95] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Confirmer
          </button>
        </div>
      )}
    </div>
  );
}

function Counter({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1, min, max))}
        disabled={value <= min}
        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#0A7C95] hover:text-[#0A7C95] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-5 text-center text-sm font-bold text-gray-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1, min, max))}
        disabled={value >= max}
        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#0A7C95] hover:text-[#0A7C95] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
