import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import ListState from "@/components/ListState";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, ArrowRight, CalendarClock, Clock, MapPin, MessageCircle, Tag } from "lucide-react";
import { useDeal } from "@/hooks/Usedeals";

const CURRENCY: Record<string, string> = { EUR: "€", USD: "$" };
const amount = (n: number, cur: string) =>
  cur === "TND" ? `${n.toLocaleString("fr-FR")} TND` : `${n.toLocaleString("fr-FR")} ${CURRENCY[cur] ?? cur}`;

function remaining(iso: string | null): { label: string; urgent: boolean } | null {
  if (!iso) return null;
  const end = new Date(`${iso}T23:59:59`);
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  const date = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  if (days <= 1) return { label: `Dernier jour, jusqu'au ${date}`, urgent: true };
  if (days <= 14) return { label: `Plus que ${days} jours, jusqu'au ${date}`, urgent: true };
  return { label: `Valable jusqu'au ${date}`, urgent: false };
}

export default function DealDetailPage() {
  const { id } = useParams();
  const { lang } = useLanguage();
  const { deal, loading, error, notFound, retry } = useDeal(id, lang === "FR" ? "fr" : "en");

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-5xl px-4 py-16" aria-busy="true">
          <div className="skeleton aspect-[16/7] w-full rounded-3xl bg-gray-200" />
          <div className="skeleton mt-6 h-8 w-2/3 rounded-lg bg-gray-200" />
        </div>
      </Layout>
    );
  }

  if (!deal) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <ListState
            error={!!error}
            onRetry={retry}
            icon={Tag}
            title={notFound ? "Cette offre n'est plus disponible" : "Impossible de charger l'offre"}
            text={notFound ? "Elle a expiré ou a été retirée. Découvrez nos autres bons plans." : "Vérifiez votre connexion puis réessayez."}
            contactSubject="general"
          />
          <p className="mt-6 text-center">
            <Link to="/bons-plans" className="font-semibold text-[#0A7C95] hover:underline">Tous les bons plans</Link>
          </p>
        </div>
      </Layout>
    );
  }

  const end = remaining(deal.valid_until);
  const isTrip = !!deal.target?.startsWith("/reserver/");
  const isHotel = !!deal.target?.startsWith("/hotels/");
  const message = `Bonjour, je suis intéressé par le bon plan « ${deal.title} ». Pouvez-vous me donner plus de détails ?`;
  const external = !!deal.target && /^https?:\/\//.test(deal.target);
  const contact = `/contact?subject=general&message=${encodeURIComponent(message)}#contact-form`;

  return (
    <Layout>
      <div className="mx-auto max-w-[1100px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-[#0A7C95]">Accueil</Link>
          <span aria-hidden="true">/</span>
          <Link to="/bons-plans" className="hover:text-[#0A7C95]">Bons plans</Link>
          <span aria-hidden="true">/</span>
          <span className="truncate font-semibold text-[#06303A]">{deal.title}</span>
        </nav>

        <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-xl shadow-[#064B5C]/5">
          <div className="relative aspect-[16/8] bg-gradient-to-br from-[#064B5C] to-[#0A7C95]">
            {deal.image_url && <img src={deal.image_url} alt={deal.title} className="h-full w-full object-cover" />}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#031E26]/80 to-transparent" />
            {deal.discount_label && (
              <span className="absolute left-4 top-4 rounded-full bg-[#F2B705] px-4 py-1.5 text-base font-extrabold text-[#06303A] shadow-lg">{deal.discount_label}</span>
            )}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F2B705]">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" /> {deal.category_name}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-4xl">{deal.title}</h1>
              {(deal.location || deal.nights) && (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-white/90">
                  {deal.location && (<><MapPin className="h-4 w-4" aria-hidden="true" /> {deal.location}</>)}
                  {deal.nights && <span>{deal.location && "• "}{deal.nights} nuits</span>}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_340px]">
            <div>
              {end && (
                <p className={`mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${end.urgent ? "bg-orange-50 text-orange-700" : "bg-[#EAF3F5] text-[#064B5C]"}`}>
                  <Clock className="h-4 w-4" aria-hidden="true" /> {end.label}
                </p>
              )}
              <h2 className="text-lg font-bold text-[#06303A]">À propos de cette offre</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-gray-600">
                {deal.description || "Contactez-nous pour connaître le détail de cette offre et ses conditions."}
              </p>
              {deal.trip_to && (
                <Link to={deal.trip_to} className="mt-5 inline-flex items-center gap-1.5 font-semibold text-[#0A7C95] hover:underline">
                  {isTrip ? "Voir le programme complet du voyage" : "Voir la fiche de l'hôtel"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>

            <aside className="h-fit rounded-2xl border border-gray-200 bg-[#F7FBFC] p-5 lg:sticky lg:top-24">
              {deal.price != null ? (
                <>
                  {deal.old_price && (
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-gray-400 line-through">{amount(deal.old_price, deal.currency)}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                        Vous économisez {amount(deal.old_price - deal.price, deal.currency)}
                      </span>
                    </p>
                  )}
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#0A7C95]">{amount(deal.price, deal.currency)}</span>
                    <span className="text-sm text-gray-500">/ pers.</span>
                  </p>
                </>
              ) : (
                <p className="text-2xl font-extrabold text-[#0A7C95]">Prix sur devis</p>
              )}

              {(() => {
                const cls = "mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-5 py-3 text-base font-bold text-[#06303A] shadow-md transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2";
                const label = isTrip ? "Réserver cette offre" : isHotel ? "Voir les disponibilités" : "Profiter de l'offre";
                const icon = <ArrowRight className="h-5 w-5" aria-hidden="true" />;
                return external
                  ? <a href={deal.target!} target="_blank" rel="noopener noreferrer" className={cls}>{label} {icon}</a>
                  : <Link to={deal.target ?? contact} className={cls}>{label} {icon}</Link>;
              })()}
              <Link
                to={contact}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#064B5C]/25 bg-white px-5 py-2.5 text-sm font-semibold text-[#064B5C] transition hover:border-[#0A7C95] hover:text-[#0A7C95]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Poser une question
              </Link>
              <p className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Places limitées, offre soumise à disponibilité.
              </p>
            </aside>
          </div>
        </div>

        <p className="mt-6">
          <Link to="/bons-plans" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A7C95] hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour aux bons plans
          </Link>
        </p>
      </div>
    </Layout>
  );
}
