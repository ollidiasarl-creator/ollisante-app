import { ApiError } from '../api/client';

/** Message affichable : traduit si le code d'erreur est connu, sinon le message du serveur. */
export function errorMessage(e: unknown, t: (key: string) => string): string {
  if (e instanceof ApiError) {
    if (e.code === 'VALIDATION_ERROR' && e.fieldErrors) {
      const first = Object.values(e.fieldErrors)[0];
      if (first) return first;
    }
    const key = `err.${e.code}`;
    const translated = t(key);
    return translated !== key ? translated : e.message;
  }
  return t('err.GENERIC');
}
