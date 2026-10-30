/** Brand loading indicators: spinning teal→gold ring, full-page logo loader, shimmering card skeletons. */

export function Spinner({ size = 40, label }: { size?: number; label?: string }) {
  return (
    <span role="status" className="inline-flex flex-col items-center gap-3">
      <span
        className="loader-ring"
        style={{ width: size, height: size, borderWidth: Math.max(3, Math.round(size / 10)) }}
        aria-hidden="true"
      />
      {label ? (
        <span className="text-sm font-medium text-gray-500">{label}</span>
      ) : (
        <span className="sr-only">Chargement…</span>
      )}
    </span>
  );
}

/** First load of a page: logo inside a rotating ring */
export function PageLoader() {
  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="loader-ring absolute inset-0" style={{ borderWidth: 4 }} aria-hidden="true" />
        <img src="/logoseif.png" alt="" className="h-14 w-14 animate-pulse object-contain" />
      </div>
      <div className="loader-dots flex gap-1.5" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

/** Placeholder card while a list loads */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" aria-hidden="true">
      <div className="skeleton h-52" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="flex gap-2 pt-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="skeleton h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Grid of skeleton cards with a screen-reader status */
export function CardGridSkeleton({ count = 6, className = "" }: { count?: number; className?: string }) {
  return (
    <div role="status" className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
