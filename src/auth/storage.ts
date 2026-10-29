import * as SecureStore from 'expo-secure-store';
import { forgetAll } from '../lib/offline';

const TOKENS_KEY = 'ollisante.tokens';
const LANG_KEY = 'ollisante.lang';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/** Les jetons sont gardés dans le coffre sécurisé du téléphone (Keychain iOS / Keystore Android). */
export const tokenStore = {
  async load(): Promise<StoredTokens | null> {
    try {
      const raw = await SecureStore.getItemAsync(TOKENS_KEY);
      return raw ? (JSON.parse(raw) as StoredTokens) : null;
    } catch {
      return null;
    }
  },
  async save(tokens: StoredTokens): Promise<void> {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  },
  async clear(): Promise<void> {
    // Déconnexion : les informations gardées hors connexion (rendez-vous, profil…) sont effacées avec la session.
    forgetAll();
    try {
      await SecureStore.deleteItemAsync(TOKENS_KEY);
    } catch {
      // rien à faire : le coffre était déjà vide
    }
  },
};

export const langStore = {
  async load(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(LANG_KEY);
    } catch {
      return null;
    }
  },
  async save(lang: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(LANG_KEY, lang);
    } catch {
      // préférence non critique
    }
  },
};

const COUNTRY_KEY = 'ollisante.country';

/** Pays choisi sur l'écran d'ouverture (actualités affichées). */
export const countryStore = {
  async load(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(COUNTRY_KEY);
    } catch {
      return null;
    }
  },
  async save(code: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(COUNTRY_KEY, code);
    } catch {
      // préférence non critique
    }
  },
};

const DEVICE_KEY = 'ollisante.device';

/** Appareil de confiance (double authentification) : plus de code e-mail sur ce téléphone pendant 30 jours. */
export const deviceStore = {
  async load(): Promise<string | undefined> {
    try {
      return (await SecureStore.getItemAsync(DEVICE_KEY)) ?? undefined;
    } catch {
      return undefined;
    }
  },
  async save(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(DEVICE_KEY, token);
    } catch {
      // sans coffre, le code sera redemandé à la prochaine connexion
    }
  },
};
