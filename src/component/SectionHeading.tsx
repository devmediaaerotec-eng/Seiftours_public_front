import type { ReactNode } from "react";

/** Home section title: eyebrow pill, title with a teal highlight, gold bar (same as the footer column titles). */
export default function SectionHeading({
  eyebrow,
  title,
  highlight,
  subtitle,
  align = "center",
  dark,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle?: string;
  align?: "center" | "left";
  /** On a deep-teal background */
  dark?: boolean;
  /** Extra content under the subtitle (e.g. a link) */
  children?: ReactNode;
}) {
  const center = align === "center";
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${
          dark ? "bg-white/10 text-[#F2B705]" : "bg-[#E8F5F8] text-[#0A7C95]"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#E3A312]" aria-hidden="true" />
        {eyebrow}
      </span>
      <h2
        className={`mt-4 text-[28px] font-extrabold leading-tight tracking-tight sm:text-4xl ${
          dark ? "text-white" : "text-[#06303A]"
        }`}
      >
        {title} <span className={dark ? "text-[#06303A]" : "text-[#06303A]"}>{highlight}</span>
      </h2>
      <div className={`mt-3 h-1 w-12 rounded-full bg-[#E3A312] ${center ? "mx-auto" : ""}`} aria-hidden="true" />
      {subtitle && (
        <p className={`mt-4 text-base leading-relaxed ${dark ? "text-white/75" : "text-gray-600"}`}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}
