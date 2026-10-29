import { getLocales } from 'expo-localization';
import { API_URL } from '../config';

/** Les images envoyées sur le serveur ont un chemin relatif (/media/…) : on le complète avec l'adresse de l'API. */
export function mediaUrl(url: string): string {
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

/** Identifiant d'une vidéo YouTube (liens youtube.com/watch, youtu.be, /shorts, /embed), sinon null. */
export function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

/** Image d'aperçu d'une vidéo YouTube, ou null pour les autres sites. */
export function videoThumbnail(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** Pays du téléphone (réglages régionaux), pour pré-remplir les choix. */
export function deviceCountry(): string | null {
  try {
    return getLocales()[0]?.regionCode ?? null;
  } catch {
    return null;
  }
}
