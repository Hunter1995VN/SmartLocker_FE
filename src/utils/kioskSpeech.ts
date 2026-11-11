import type { KioskLanguage } from './kioskI18n';
import { kioskLocales } from './kioskMessages';

/**
 * UC-T23: đọc hướng dẫn trên kiosk bằng giọng của trình duyệt theo ngôn ngữ đang chọn.
 * Trả về false khi trình duyệt không hỗ trợ hoặc thiết bị chưa cài giọng đọc ngôn ngữ đó
 * (khi đó giao diện hiển thị thông báo "voiceUnavailable" và vẫn dùng được bằng chữ).
 */
export function findKioskVoice(language: KioskLanguage): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const locale = kioskLocales[language].toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  return voices.find(voice => voice.lang.toLowerCase().replace('_', '-') === locale)
    ?? voices.find(voice => voice.lang.toLowerCase().startsWith(locale.slice(0, 2)));
}

export function speakKiosk(text: string, language: KioskLanguage): boolean {
  const voice = findKioskVoice(language);
  if (!voice || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = kioskLocales[language];
  utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopKioskSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
