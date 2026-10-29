const ZERO_DECIMAL = ['XOF', 'XAF', 'GNF', 'CDF', 'RWF'];

/** Montant en unité minimale (centimes, ou franc entier pour XOF/GNF/CDF…) → texte lisible. */
export function formatMoney(minor: number, currency: string, locale: string): string {
  const value = ZERO_DECIMAL.includes(currency) ? minor : minor / 100;
  return `${value.toLocaleString(locale)} ${currency}`;
}

/** YYYY-MM-DD en heure locale du téléphone. */
export function isoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Clé de regroupement par jour (heure locale du téléphone). */
export function dayKey(iso: string): string {
  return isoDate(new Date(iso));
}

export function formatDay(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDayLong(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Indicatif + numéro national → format international (+22370000000), ou null si le numéro est invalide. */
export function toE164(dialCode: string, national: string): string | null {
  const digits = national.replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length < 6 || digits.length > 12) return null;
  return `${dialCode}${digits}`;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

/** Accepte « 70 00 00 00 » (avec l'indicatif du pays) ou « +33 6 12 34 56 78 » (déjà international). */
export function toInternational(dialCode: string, input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  return toE164(dialCode, trimmed);
}
