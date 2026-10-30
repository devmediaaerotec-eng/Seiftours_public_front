import { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function FloatingElements() {
  const [showTop, setShowTop] = useState(false);
  // 1. Set initial state to TRUE so it starts open
  const [socialOpen, setSocialOpen] = useState(true);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const socials = [
    { icon: FacebookIcon, label: "Facebook", color: "bg-[#1877F2] hover:bg-[#0f5cc5]", href: "https://www.facebook.com/share/1YMv5nJFbZ/?mibextid=wwXIfr" },
    { icon: InstagramIcon, label: "Instagram", color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90", href: "https://www.instagram.com/safes_tour/" },
    { icon: MessageCircle, label: "WhatsApp", color: "bg-[#25D366] hover:bg-[#1faa51]", href: "https://wa.me/21620965714" },
   ];

  return (
    <>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full bg-[#0A7C95] hover:bg-[#064B5C] text-white shadow-2xl flex items-center justify-center transition-all duration-300 ${
          showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Return to top"
      >
        <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
      </button>

      {/* Social Route */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* Social items */}
        <div
          className={`flex flex-col gap-2.5 transition-all duration-300 ${
            socialOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          {socials.map((s, idx) => {
            const Icon = s.icon;
            return (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className={`group relative w-11 h-11 rounded-full ${s.color} text-white shadow-lg flex items-center justify-center transition-all hover:scale-110`}
                // Staggered animation when opening
                style={{ transitionDelay: socialOpen ? `${idx * 50}ms` : "0ms" }}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
                <span className="absolute right-full mr-3 whitespace-nowrap bg-gray-900 text-white text-xs font-semibold px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {s.label}
                </span>
              </a>
            );
          })}
        </div>

        {/* Main toggle */}
        <button
          onClick={() => setSocialOpen(!socialOpen)}
          className={`relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
            socialOpen
              ? "bg-gray-800 rotate-0 hover:bg-black" // Styles for the 'X' state
              : "bg-[#E3A312] hover:bg-[#F2B705]"    // Styles for the 'Share' state
          }`}
          aria-label={socialOpen ? "Close menu" : "Open menu"}
        >
          {/* Pulse notification only shows when menu is closed */}
          {!socialOpen && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#0A7C95] rounded-full border-2 border-white animate-pulse" />
          )}
          
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={socialOpen ? "text-white" : "text-gray-900"}
          >
            {socialOpen ? (
              // The "X" Icon
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              // The "Share" Icon
              <>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </>
            )}
          </svg>
        </button>
      </div>
    </>
  );
}