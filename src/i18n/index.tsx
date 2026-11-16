import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { EN } from './en';

/**
 * Ngôn ngữ giao diện web cho khách (Việt / Anh). Kiosk có bộ ngôn ngữ riêng (utils/kioskMessages.ts).
 *
 * Cách dùng: viết câu tiếng Việt làm khóa, `t('Đặt tủ ngay')`. Tiếng Anh nằm trong `en.ts`; câu chưa có bản dịch
 * hiện nguyên tiếng Việt (không bao giờ hiện khóa trống). Biến số dùng `{tên}`: `t('Còn {n} ô', { n: 3 })`.
 * Ngôn ngữ mặc định theo trình duyệt (vi -> Việt, còn lại -> Anh), người dùng đổi bằng LanguageSwitcher và được nhớ lại.
 */
export type Lang = 'VI' | 'EN';

const STORAGE_KEY = 'smartlocker_lang';

function detectLang(): Lang {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'VI' || saved === 'EN') return saved;
    } catch { /* bộ nhớ trình duyệt bị chặn: dùng ngôn ngữ trình duyệt */ }
    const nav = typeof navigator !== 'undefined' ? (navigator.language || '').toLowerCase() : 'vi';
    return nav.startsWith('vi') ? 'VI' : 'EN';
}

interface LanguageContextValue {
    lang: Lang;
    setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({ lang: 'VI', setLang: () => undefined });

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(detectLang);

    useEffect(() => {
        document.documentElement.lang = lang === 'VI' ? 'vi' : 'en';
    }, [lang]);

    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* không lưu được thì chỉ đổi cho phiên này */ }
    }, []);

    const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    return useContext(LanguageContext);
}

function fill(text: string, vars?: Record<string, string | number>) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** Trả về hàm dịch gắn với ngôn ngữ hiện tại; component dùng hook này sẽ tự vẽ lại khi đổi ngôn ngữ. */
export function useT() {
    const { lang } = useLanguage();
    return useCallback(
        (vi: string, vars?: Record<string, string | number>) => fill(lang === 'EN' ? (EN[vi] ?? vi) : vi, vars),
        [lang],
    );
}
