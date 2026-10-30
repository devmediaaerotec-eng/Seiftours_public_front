import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Lang = 'FR' | 'EN';

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
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  formatPrice: (amount: number) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('FR');

  const t = (key: string): string => translations[lang][key] ?? key;

  const formatPrice = (amount: number): string =>
    `${amount.toLocaleString('fr-TN')} TND`;

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
