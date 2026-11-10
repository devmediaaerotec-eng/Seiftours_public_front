import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { PageLoader } from './component/Loader';
import Index from './pages/Index';
import Checkout from './pages/Checkout';
import BookingStatus from './pages/BookingStatus';
import Circuitdetailpage from "./pages/Circuitdetailpage";
 import Reservation from "./pages/Reservation";
 import TripDetail from "./pages/TripDetail"
import BonsPlansPage from './pages/BonsPlans';
import DealDetailPage from './pages/DealDetailPage';



const pages = {
  HotelsTunisie: () => import('./pages/HotelsTunisie'),

  VoyageOrganise: () => import('./pages/VoyageOrganise'),
  CircuitPage: () => import('./pages/CircuitPage'),
  Omra: () => import('./pages/Omra'),
  Transport: () => import('./pages/Transport'),
  Vol: () => import('./pages/Vol'),
  BonsPlans: () => import('./pages/BonsPlans'),
  Contact: () => import('./pages/Contact'),
  HotelDetail: () => import('./pages/HotelDetail'),
   Circuitdetailpage: () => import('./pages/Circuitdetailpage'),

};
const HotelsTunisie = lazy(pages.HotelsTunisie);
const VoyageOrganise = lazy(pages.VoyageOrganise);
const Circuit = lazy(pages.CircuitPage);
const Omra = lazy(pages.Omra);
const Transport = lazy(pages.Transport);
const Vol = lazy(pages.Vol);
const BonsPlans = lazy(pages.BonsPlans);
const Contact = lazy(pages.Contact);
const HotelDetail = lazy(pages.HotelDetail);
   
 function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

 function usePrefetchPages() {
  useEffect(() => {
    const run = () => Object.values(pages).forEach((load) => load().catch(() => {}));
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(run, 2500);
    return () => clearTimeout(id);
  }, []);
}
 

const queryClient = new QueryClient();

const AppRoutes = () => {
  usePrefetchPages();
  return (
  <Suspense fallback={<PageLoader />}>
  <ScrollToTop />
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/hotels-tunisie" element={<HotelsTunisie />} />
    <Route path="/hotels/:id" element={<HotelDetail />} />
    <Route path="/voyage-organise" element={<VoyageOrganise />} />
    <Route path="/circuit" element={<Circuit />} />
    <Route path="/omra" element={<Omra />} />
    <Route path="/transport" element={<Transport />} />
    <Route path="/vol" element={<Vol />} />
    <Route path="/bons-plans" element={<BonsPlans />} />
    <Route path="/contact" element={<Contact />} />
         import DealDetailPage from "./pages/DealDetailPage";

   <Route path="/bons-plans" element={<BonsPlansPage />} />
   <Route path="/bons-plans/:id" element={<DealDetailPage />} />
    <Route path="/checkout" element={<Checkout />} />
        <Route path="/reservation/:reference" element={<BookingStatus />} />
        <Route path="/circuit/:slug" element={<Circuitdetailpage />} />

<Route path="/voyage-organise" element={<VoyageOrganise />} />
<Route path="/voyage-organise/:slug" element={<TripDetail />} />
<Route path="/omra/:slug" element={<TripDetail />} /> 
 
 
<Route path="/reserver/:slug" element={<Reservation />} />
 
  </Routes>
  </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
 
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
   </QueryClientProvider>
);

export default App;
export { AppRoutes };
