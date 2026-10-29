/** Adresse de l'API (voir .env.example). */
export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ollisante.com';
/** Téléconsultation vidéo : masquée tant que l'appel vidéo n'est pas développé. */
export const VIDEO_ENABLED = false;
export const SUPPORT_EMAIL: string = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '';
const LEGAL_BASE = `${API_URL.replace(/\/$/, '')}/legal`;
/** Documents légaux publiés par le serveur (une adresse fixée dans .env reste prioritaire). */
export const TERMS_URL: string = process.env.EXPO_PUBLIC_TERMS_URL || `${LEGAL_BASE}/cgu.html`;
export const PRIVACY_URL: string = process.env.EXPO_PUBLIC_PRIVACY_URL || `${LEGAL_BASE}/confidentialite.html`;
export const LEGAL_NOTICE_URL = `${LEGAL_BASE}/mentions-legales.html`;
/** Espace web des structures (horaires, sites, profil complet). */
export const STRUCTURE_WEB_URL = `${API_URL.replace(/\/$/, '')}/structure/`;
