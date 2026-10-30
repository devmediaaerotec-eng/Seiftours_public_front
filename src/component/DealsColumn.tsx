import { Star, MapPin, Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Deal {
  id: number;
  titleFr: string;
  titleEn: string;
  locationFr: string;
  locationEn: string;
  image: string;
  rating: number;
  reviews: number;
  oldPrice: number;
  price: number;
  nights: number;
  tag?: string;
  tagType?: "discount" | "label";
}

const deals: Deal[] = [
  {
    id: 1,
    titleFr: "Séjour Paradisiaque",
    titleEn: "Paradise Getaway",
    locationFr: "Santorin, Grèce",
    locationEn: "Santorini, Greece",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhrfuryaaflq/deal-santorini.png",
    rating: 4.9,
    reviews: 312,
    oldPrice: 3999,
    price: 2799,
    nights: 7,
    tag: "-30%",
    tagType: "discount",
  },
  {
    id: 2,
    titleFr: "Évasion Tropicale",
    titleEn: "Tropical Escape",
    locationFr: "Maldives",
    locationEn: "Maldives",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhrft6qaafmq/deal-maldives.png",
    rating: 5.0,
    reviews: 198,
    oldPrice: 7799,
    price: 5599,
    nights: 6,
    tag: "FR",
    tagType: "label",
  },
  {
    id: 3,
    titleFr: "Découverte Culturelle",
    titleEn: "Cultural Discovery",
    locationFr: "Marrakech, Maroc",
    locationEn: "Marrakech, Morocco",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhrfriaaafla/deal-marrakech.png",
    rating: 4.7,
    reviews: 456,
    oldPrice: 2299,
    price: 1549,
    nights: 5,
    tag: "-33%",
    tagType: "discount",
  },
  {
    id: 4,
    titleFr: "Week-end Romantique",
    titleEn: "Romantic Weekend",
    locationFr: "Paris, France",
    locationEn: "Paris, France",
    image: "https://mgx-backend-cdn.metadl.com/generate/images/776637/2026-04-24/nhreuyaaafla/destination-paris-eiffel.png",
    rating: 4.8,
    reviews: 287,
    oldPrice: 1899,
    price: 1399,
    nights: 3,
  },
];

export default function DealsColumn() {
  const { lang, t, formatPrice } = useLanguage();

  const popularLabel = lang === "FR" ? "Populaire" : "Popular";
  const offersLabel = lang === "FR" ? "Offres exclusives du moment" : "Exclusive offers now";
  const nightsLabel = lang === "FR" ? "nuits" : "nights";

  return (
    <aside className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="bg-gradient-to-r from-[#0A7C95] to-[#0096C7] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#F2B705] flex items-center justify-center shadow-sm">
            <Flame className="w-5 h-5 text-[#0A7C95]" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{t("deals.title")}</h3>
            <p className="text-[#E8F5F8] text-xs">{offersLabel}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-white bg-white/20 px-2 py-1 rounded-full">
          {t("deals.live").toUpperCase()}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[620px]">
        {deals.map((deal) => (
          <a
            key={deal.id}
            href="#"
            className="group flex gap-3 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
              <img
                src={deal.image}
                alt={lang === "FR" ? deal.titleFr : deal.titleEn}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {deal.tag && (
                <span
                  className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    deal.tagType === "discount"
                      ? "bg-[#F2B705] text-gray-900"
                      : "bg-[#0A7C95] text-white"
                  }`}
                >
                  {deal.tagType === "discount" ? deal.tag : popularLabel}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm text-gray-900 leading-tight group-hover:text-[#0A7C95] transition-colors line-clamp-1">
                  {lang === "FR" ? deal.titleFr : deal.titleEn}
                </h4>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">
                    {lang === "FR" ? deal.locationFr : deal.locationEn}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3.5 h-3.5 fill-[#E3A312] text-[#E3A312]" />
                  <span className="text-xs font-semibold text-gray-700">{deal.rating}</span>
                  <span className="text-xs text-gray-400">({deal.reviews})</span>
                </div>
              </div>

              <div className="flex items-end justify-between mt-1">
                <div>
                  <div className="text-[10px] text-gray-400 line-through">
                    {formatPrice(deal.oldPrice)}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold text-[#0A7C95]">
                      {formatPrice(deal.price)}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500">
                  {deal.nights} {nightsLabel}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <button className="w-full py-2.5 bg-[#0A7C95] hover:bg-[#064B5C] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          {t("deals.view_all")}
        </button>
      </div>
    </aside>
  );
}