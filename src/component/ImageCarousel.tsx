import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Expand, Images, X } from "lucide-react";

/**
 * Photo carousel built on CSS scroll-snap: native swipe on touch screens,
 * arrows / keyboard / thumbnails on desktop, and a full-screen view.
 */
export default function ImageCarousel({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const many = photos.length > 1;

  return (
    <div>
      <Track
        photos={photos}
        alt={alt}
        index={index}
        onIndex={setIndex}
        className="aspect-[4/3] rounded-3xl sm:aspect-[16/9]"
        overlay={
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#06303A] shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]"
          >
            {many ? <Images className="h-4 w-4" aria-hidden="true" /> : <Expand className="h-4 w-4" aria-hidden="true" />}
            {many ? `${photos.length} photos` : "Agrandir"}
          </button>
        }
      />

      {many && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {photos.map((p, i) => (
            <button
              key={p + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 transition sm:h-[72px] sm:w-28 ${
                i === index ? "ring-[#0A7C95]" : "opacity-60 ring-transparent hover:opacity-100"
              }`}
            >
              <img src={p} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[60] flex flex-col bg-[#031E26]/95 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-semibold">
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              autoFocus
              aria-label="Fermer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B705]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <Track
            photos={photos}
            alt={alt}
            index={index}
            onIndex={setIndex}
            onEscape={() => setFullscreen(false)}
            fit="contain"
            className="mx-auto w-full max-w-6xl flex-1"
          />
          <div className="h-6" />
        </div>
      )}
    </div>
  );
}

function Track({
  photos,
  alt,
  index,
  onIndex,
  onEscape,
  className,
  overlay,
  fit = "cover",
}: {
  photos: string[];
  alt: string;
  index: number;
  onIndex: (i: number) => void;
  onEscape?: () => void;
  className: string;
  overlay?: React.ReactNode;
  fit?: "cover" | "contain";
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Target of a scroll we started ourselves: intermediate positions must not change the index
  const pending = useRef<number | null>(null);
  const many = photos.length > 1;

  // Follow index changes coming from thumbnails / arrows (no-op when already there)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 2) {
      pending.current = target;
      el.scrollTo({ left: target, behavior: "smooth" });
    }
  }, [index]);

  // Close the full-screen view with Escape, and lock the page scroll behind it
  useEffect(() => {
    if (!onEscape) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onEscape();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onEscape]);

  const go = (i: number) => onIndex((i + photos.length) % photos.length);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(index - 1);
    if (e.key === "ArrowRight") go(index + 1);
  };

  const arrow =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#06303A] shadow-lg transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] sm:flex";

  return (
    <div
      className={`group relative overflow-hidden bg-[#06303A] ${className}`}
      role="region"
      aria-roledescription="carrousel"
      aria-label={alt}
      tabIndex={0}
      onKeyDown={onKey}
    >
      <div
        ref={ref}
        // A user swipe or wheel takes over from any scroll we started
        onPointerDown={() => (pending.current = null)}
        onWheel={() => (pending.current = null)}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (pending.current !== null) {
            if (Math.abs(el.scrollLeft - pending.current) > 2) return;
            pending.current = null;
          }
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) onIndex(i);
        }}
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((src, i) => (
          <div key={src + i} className="relative h-full w-full shrink-0 snap-center">
            <img
              src={src}
              alt={`${alt} – photo ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
            />
          </div>
        ))}
      </div>

      {many && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label="Photo précédente" className={`${arrow} left-3`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Photo suivante" className={`${arrow} right-3`}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-[#031E26]/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {index + 1} / {photos.length}
          </span>
        </>
      )}
      {overlay}
    </div>
  );
}
