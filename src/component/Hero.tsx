import { Link } from "react-router-dom";
import BestSellerSlider from "./BestSellerSlider";
import HeroSearch from "./HeroSearch";
import { useLanguage } from "@/contexts/LanguageContext";


const SIDE_PANELS = [
  {
    id: "left",
    image: "/side-left.png",
    titleFr: "Voyages organisés",
    titleEn: "Organized trips",
    subEn: "Turkey, Egypt, Morocco, Dubai and more",
    ctaFr: "Découvrir",
    ctaEn: "Discover",
    to: "/voyage-organise",
  },
  {
    id: "right",
    image: "/side-right.png",
    titleFr: "Séjours en Tunisie",
    titleEn: "Stays in Tunisia",
    subEn: "Hotels on the Mediterranean coast",
    ctaFr: "Voir les hôtels",
    ctaEn: "See hotels",
    to: "/hotels-tunisie",
  },
];

export default function Hero() {
  const { t, lang } = useLanguage();
  const FR = lang === "FR";

  return (
    <section className="relative bg-gradient-to-b from-[#E8F5F8] to-white py-6 lg:py-10">
     <div className="mx-auto max-w-[1700px] px-1 sm:px-2 lg:px-3">
         <h1 className="sr-only">
          {t("hero.title_1")} {t("hero.title_2")}
        </h1>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.3fr)_minmax(0,1fr)] lg:gap-6">
           <div className="order-1 col-span-2 flex flex-col lg:order-2 lg:col-span-1">
            <BestSellerSlider />
            <HeroSearch />
          </div>

          {/* Fixed side images */}
          {SIDE_PANELS.map((panel, index) => (
            <Link
              key={panel.id}
              to={panel.to}
              className={`group relative block h-56 overflow-hidden rounded-3xl shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A312] lg:h-auto lg:min-h-[560px] ${
                index === 0 ? "order-2 lg:order-1" : "order-3"
              }`}
            >
              <img
                src={panel.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#031E26]/90 via-[#064B5C]/30 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <h2 className="text-lg font-extrabold leading-tight text-white sm:text-2xl">
                  {FR ? panel.titleFr : panel.titleEn}
                </h2>
                 
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E3A312] px-4 py-2 text-xs font-bold text-[#06303A] transition-colors group-hover:bg-[#F2B705] sm:text-sm">
                  {FR ? panel.ctaFr : panel.ctaEn}
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}