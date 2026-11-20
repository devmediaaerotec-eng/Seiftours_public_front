import { LANGS, useLanguage } from '@/contexts/LanguageContext';

/** Compact FR / EN / AR selector. `tone="light"` for dark backgrounds (top bar), "dark" for white backgrounds. */
export default function LangSwitcher({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { lang, setLang } = useLanguage();
  const base = tone === 'light'
    ? { active: 'bg-gold-500 text-brand-950', idle: 'text-white/70 hover:text-white' }
    : { active: 'bg-brand-600 text-white', idle: 'text-gray-500 hover:text-gray-900' };

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Langue / Language / اللغة">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          title={label}
          className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase transition-colors sm:text-xs ${
            lang === code ? base.active : base.idle
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
