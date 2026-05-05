import en from './translations/en.json';
import pl from './translations/pl.json';
import es from './translations/es.json';

type Messages = typeof en;

const dictionaries: Record<string, Messages> = { en, pl, es };

export function getLanguage() {
  return localStorage.getItem('cms_language') || 'en';
}

export function setLanguage(language: string) {
  localStorage.setItem('cms_language', language);
  window.location.reload();
}

export function t(key: keyof Messages) {
  const messages = dictionaries[getLanguage()] ?? en;
  return messages[key] ?? key;
}
