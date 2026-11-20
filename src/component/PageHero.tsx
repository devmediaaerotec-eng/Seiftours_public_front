import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  badge?: string;
  breadcrumb?: string;
  image?: string;
  /** CSS object-position of the image, e.g. "center 20%" to keep the top of a tall photo */
  imagePosition?: string;
  children?: ReactNode;
}

/**
 * Inner page banner. Height follows the content, with extra room at the bottom
 * for the cards that overlap it (search forms, stats bands use -mt-10 / -mt-16).
 */
export default function PageHero({
  title,
  subtitle,
  badge,
  breadcrumb,
  // Tunisian coast (also used on the home page): matches the agency and the teal palette
  image = "/side-right.png",
  imagePosition = "center 55%",
  children,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-brand-900">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: imagePosition }} fetchPriority="high" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-800/70 to-brand-800/30" />
      <svg
        className="pointer-events-none absolute -right-24 -top-24 h-[440px] w-[440px] text-brand-600 opacity-30"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1" strokeDasharray="420 160" />
        <circle cx="100" cy="100" r="76" stroke="currentColor" strokeWidth="0.6" strokeDasharray="280 200" />
      </svg>

      <div className="relative mx-auto max-w-[1400px] px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-white/75">
          <Link to="/" className="flex items-center gap-1 transition-colors hover:text-gold-400">
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            Accueil
          </Link>
          {breadcrumb && (
            <>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-medium text-white" aria-current="page">
                {breadcrumb}
              </span>
            </>
          )}
        </nav>

        {badge && (
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
            {badge}
          </span>
        )}
        <h1 className="mt-4 max-w-3xl text-[32px] font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <div className="mt-4 h-1 w-16 rounded-full bg-gold-500" aria-hidden="true" />
        {subtitle && <p className="mt-4 max-w-2xl text-base text-white/90 lg:text-lg">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
