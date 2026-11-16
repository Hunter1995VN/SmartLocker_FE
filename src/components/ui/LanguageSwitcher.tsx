import { useLanguage } from '../../i18n';
import type { Lang } from '../../i18n';

const OPTIONS: { code: Lang; label: string; name: string }[] = [
    { code: 'VI', label: 'VI', name: 'Tiếng Việt' },
    { code: 'EN', label: 'EN', name: 'English' },
];

/** Nút chuyển ngôn ngữ Việt / Anh cho web khách. Nhớ lựa chọn trong trình duyệt. */
export default function LanguageSwitcher({ className = 'inline-flex' }: { className?: string }) {
    const { lang, setLang } = useLanguage();
    return (
        <div role="group" aria-label="Language / Ngôn ngữ" className={`items-center rounded-xl border border-outline-soft bg-white p-0.5 ${className}`}>
            {OPTIONS.map((o) => (
                <button
                    key={o.code}
                    type="button"
                    lang={o.code === 'VI' ? 'vi' : 'en'}
                    aria-pressed={lang === o.code}
                    aria-label={o.name}
                    title={o.name}
                    onClick={() => setLang(o.code)}
                    className={`min-w-9 h-7 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        lang === o.code ? 'bg-primary-container text-white' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
