import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'FR' | 'EN' | 'AR';

export const LANGS: { code: Lang; label: string; locale: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'FR', label: 'Français', locale: 'fr-TN', dir: 'ltr' },
  { code: 'EN', label: 'English', locale: 'en-TN', dir: 'ltr' },
 ];

const translations: Record<Lang, Record<string, string>> = {
  FR: {
    'nav.home': 'Accueil',
    'nav.hotels_tunisia': 'Hôtels Tunisie',
    'nav.hotels_abroad': 'Hôtels Étranger',
    'nav.organized_trip': 'Voyage Organisé',
    'nav.circuit': 'Circuit',
    'nav.omra': 'Omra',
    'nav.transport': 'Transport',
    'nav.flight': 'Vol',
    'nav.deals': 'Bons Plans',
    'nav.contact': 'Contact',
    'nav.tagline': 'Voyagez en toute sécurité',
    'hero.title_1': 'Voyagez en toute',
    'hero.title_2': 'Sécurité',
    'hero.subtitle': 'Découvrez le monde avec SafeTours, votre agence de voyage de confiance en Tunisie.',
    'hero.search_destination': 'Où souhaitez-vous partir ?',
    'hero.search_btn': 'Rechercher',
    'hero.popular': 'Populaires :',
    'common.destination': 'Destination',
    'common.arrival': 'Arrivée',
    'common.departure': 'Départ',
    'common.from': 'À partir de',
    'deals.title': 'Bons Plans',
    'deals.live': 'En direct',
    'deals.view_all': 'Voir toutes les offres',
    'feat.title_1': 'Pourquoi choisir',
    'feat.title_2': 'Seif Tours',
    'feat.clients': 'Clients satisfaits',
    'feat.destinations': 'Destinations',
    'feat.experience': "Ans d'expérience",
    'feat.rating': 'Note moyenne',
    'categories.title_1': 'Nos',
    'categories.title_2': 'Services',
    'categories.subtitle': "Découvrez l'ensemble de nos services de voyage sur mesure.",
    'cat.hotels': 'Hôtels',
    'cat.hotels_desc': 'Tunisie & Étranger',
    'cat.circuits': 'Circuits',
    'cat.circuits_desc': 'Voyages organisés',
    'cat.organized': 'Voyages Organisés',
    'cat.organized_desc': 'Clé en main',
    'cat.omra': 'Omra',
    'cat.omra_desc': 'Packages spirituels',
    'cat.flight': 'Vols',
    'cat.flight_desc': 'Meilleurs tarifs',
    'cat.transport': 'Transport',
    'cat.transport_desc': 'Bus & Transferts',
    'dest.title_1': 'Nos',
    'dest.title_2': 'Destinations',
    'dest.subtitle': 'Explorez les destinations les plus populaires auprès de nos voyageurs.',
  },
  EN: {
    'nav.home': 'Home',
    'nav.hotels_tunisia': 'Hotels Tunisia',
    'nav.hotels_abroad': 'Hotels Abroad',
    'nav.organized_trip': 'Organized Trip',
    'nav.circuit': 'Circuit',
    'nav.omra': 'Omra',
    'nav.transport': 'Transport',
    'nav.flight': 'Flight',
    'nav.deals': 'Deals',
    'nav.contact': 'Contact',
    'nav.tagline': 'Travel safely',
    'hero.title_1': 'Travel with',
    'hero.title_2': 'Confidence',
    'hero.subtitle': 'Discover the world with SafeTours, your trusted travel agency in Tunisia.',
    'hero.search_destination': 'Where do you want to go?',
    'hero.search_btn': 'Search',
    'hero.popular': 'Popular:',
    'common.destination': 'Destination',
    'common.arrival': 'Arrival',
    'common.departure': 'Departure',
    'common.from': 'From',
    'deals.title': 'Best Deals',
    'deals.live': 'Live',
    'deals.view_all': 'View all offers',
    'feat.title_1': 'Why choose',
    'feat.title_2': 'Seif Tours',
    'feat.clients': 'Happy clients',
    'feat.destinations': 'Destinations',
    'feat.experience': 'Years of experience',
    'feat.rating': 'Average rating',
    'categories.title_1': 'Our',
    'categories.title_2': 'Services',
    'categories.subtitle': 'Discover all our tailor-made travel services.',
    'cat.hotels': 'Hotels',
    'cat.hotels_desc': 'Tunisia & Abroad',
    'cat.circuits': 'Circuits',
    'cat.circuits_desc': 'Organized trips',
    'cat.organized': 'Organized Trips',
    'cat.organized_desc': 'All inclusive',
    'cat.omra': 'Omra',
    'cat.omra_desc': 'Spiritual packages',
    'cat.flight': 'Flights',
    'cat.flight_desc': 'Best fares',
    'cat.transport': 'Transport',
    'cat.transport_desc': 'Bus & Transfers',
    'dest.title_1': 'Our',
    'dest.title_2': 'Destinations',
    'dest.subtitle': 'Explore the most popular destinations among our travelers.',
  },
  AR: {
    'nav.home': 'الرئيسية',
    'nav.hotels_tunisia': 'فنادق تونس',
    'nav.hotels_abroad': 'فنادق بالخارج',
    'nav.organized_trip': 'رحلة منظمة',
    'nav.circuit': 'جولة سياحية',
    'nav.omra': 'العمرة',
    'nav.transport': 'النقل',
    'nav.flight': 'رحلات الطيران',
    'nav.deals': 'عروض خاصة',
    'nav.contact': 'اتصل بنا',
    'nav.tagline': 'سافر بأمان تام',
    'hero.title_1': 'سافر بكل',
    'hero.title_2': 'أمان',
    'hero.subtitle': 'اكتشف العالم مع سيف تور، وكالة أسفارك الموثوقة في تونس.',
    'hero.search_destination': 'إلى أين تريد السفر؟',
    'hero.search_btn': 'بحث',
    'hero.popular': 'الأكثر طلباً:',
    'common.destination': 'الوجهة',
    'common.arrival': 'الوصول',
    'common.departure': 'المغادرة',
    'common.from': 'ابتداءً من',
    'deals.title': 'عروض خاصة',
    'deals.live': 'مباشر',
    'deals.view_all': 'عرض جميع العروض',
    'feat.title_1': 'لماذا تختار',
    'feat.title_2': 'سيف تور',
    'feat.clients': 'عملاء راضون',
    'feat.destinations': 'وجهات',
    'feat.experience': 'سنوات من الخبرة',
    'feat.rating': 'متوسط التقييم',
    'categories.title_1': 'خدماتنا',
    'categories.title_2': 'المميزة',
    'categories.subtitle': 'اكتشف جميع خدمات السفر المصمَّمة خصيصاً لك.',
    'cat.hotels': 'فنادق',
    'cat.hotels_desc': 'تونس والخارج',
    'cat.circuits': 'جولات',
    'cat.circuits_desc': 'رحلات منظمة',
    'cat.organized': 'رحلات منظمة',
    'cat.organized_desc': 'حلّ متكامل',
    'cat.omra': 'العمرة',
    'cat.omra_desc': 'باقات روحية',
    'cat.flight': 'رحلات الطيران',
    'cat.flight_desc': 'أفضل الأسعار',
    'cat.transport': 'النقل',
    'cat.transport_desc': 'حافلات وتنقلات',
    'dest.title_1': 'وجهاتنا',
    'dest.title_2': 'المميزة',
    'dest.subtitle': 'استكشف أكثر الوجهات شعبية بين مسافرينا.',
  },
};

const LOCALE: Record<Lang, string> = { FR: 'fr-TN', EN: 'en-TN', AR: 'ar-TN' };

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  formatPrice: (amount: number) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const initialLang = (): Lang => {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null;
  return saved === 'EN' || saved === 'AR' || saved === 'FR' ? saved : 'FR';
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Keep <html lang/dir> in sync so the whole page mirrors in Arabic (RTL).
  useEffect(() => {
    const dir = lang === 'AR' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang.toLowerCase();
    document.documentElement.dir = dir;
  }, [lang]);

  const setLang = (next: Lang) => {
    try { localStorage.setItem('lang', next); } catch { /* ignore */ }
    setLangState(next);
  };

  const t = (key: string): string => translations[lang][key] ?? translations.FR[key] ?? key;

  const formatPrice = (amount: number): string => `${amount.toLocaleString(LOCALE[lang])} TND`;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, formatPrice }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
