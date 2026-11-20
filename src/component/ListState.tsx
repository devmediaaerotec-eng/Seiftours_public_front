import { Link } from "react-router-dom";
import { CloudOff, MessageCircle, RotateCcw, type LucideIcon } from "lucide-react";

/** Error / empty message for a list, always with a way forward (retry or contact). */
export default function ListState({
  error,
  onRetry,
  icon: Icon,
  title,
  text,
  contactSubject,
}: {
  error?: boolean;
  onRetry?: () => void;
  /** Icon of the empty state */
  icon: LucideIcon;
  title: string;
  text: string;
  /** /contact?subject=… */
  contactSubject: string;
}) {
  const Shown = error ? CloudOff : Icon;
  return (
    <div
      role={error ? "alert" : "status"}
      className="rounded-3xl border border-dashed border-brand-600/30 bg-white px-6 py-12 text-center"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        <Shown className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-brand-900">
        {error ? "Impossible de charger les offres" : title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        {error
          ? "Le service est momentanément indisponible. Réessayez dans un instant ou contactez-nous directement."
          : text}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-800 px-5 py-2.5 text-sm font-bold text-brand-800 transition hover:bg-brand-800 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Réessayer
          </button>
        )}
        <Link
          to={`/contact?subject=${contactSubject}#contact-form`}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Nous contacter
        </Link>
      </div>
    </div>
  );
}
