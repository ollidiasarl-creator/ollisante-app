import type { Specialty } from '../api/types';

/** Recherche générale (comme sur le site) : minuscules sans accents, mots courants menant à une spécialité, classement. */
export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, ' ').trim();

/** Mots du langage courant qui mènent à une spécialité (métier, organe, symptôme). */
const SYNONYMS: Record<string, string[]> = {
  GENERAL_PRACTICE: ['generaliste', 'medecin generaliste', 'medecin traitant', 'docteur', 'fievre', 'paludisme', 'palu', 'grippe', 'toux', 'rhume', 'diabete', 'bilan'],
  PEDIATRICS: ['pediatre', 'enfant', 'enfants', 'bebe', 'nourrisson'],
  GYNECOLOGY: ['gyneco', 'gynecologue', 'grossesse', 'enceinte', 'contraception', 'accouchement', 'regles'],
  CARDIOLOGY: ['cardiologue', 'coeur', 'tension', 'hypertension', 'palpitations'],
  DENTISTRY: ['dentiste', 'dent', 'dents', 'carie', 'gencive', 'gencives'],
  OPHTHALMOLOGY: ['ophtalmo', 'ophtalmologue', 'yeux', 'oeil', 'vue', 'lunettes'],
  DERMATOLOGY: ['dermato', 'dermatologue', 'peau', 'bouton', 'boutons', 'acne', 'eczema', 'demangeaison'],
  ENT: ['orl', 'oreille', 'oreilles', 'gorge', 'nez', 'angine', 'sinusite', 'otite'],
  PSYCHIATRY: ['psychiatre', 'psy', 'depression', 'stress', 'anxiete'],
  NEUROLOGY: ['neurologue', 'migraine', 'epilepsie'],
  ORTHOPEDICS: ['orthopediste', 'os', 'fracture', 'dos', 'genou', 'articulation'],
  UROLOGY: ['urologue', 'prostate', 'urine', 'reins'],
  GASTROENTEROLOGY: ['gastro', 'gastroenterologue', 'estomac', 'ventre', 'digestion', 'ulcere'],
  NUTRITION: ['nutritionniste', 'dieteticien', 'poids', 'regime'],
  RADIOLOGY: ['radiologue', 'radio', 'echographie', 'scanner', 'irm'],
  ANESTHESIOLOGY: ['anesthesiste', 'anesthesie'],
};

/** Thématiques de santé proposées dès la première lettre ; elles mènent à la page de résultats (infos, actualités, spécialités). */
export const TOPICS = [
  'Paludisme', 'Fièvre', 'Toux', 'Grippe', 'Rhume', 'Diabète', 'Hypertension', 'Tension artérielle', 'Grossesse',
  'Contraception', 'Accouchement', 'Vaccination', 'Rougeole', 'Choléra', 'Diarrhée', 'Maux de ventre', 'Mal de dents',
  'Carie', 'Acné', 'Eczéma', 'Démangeaisons', 'Angine', 'Otite', 'Sinusite', 'Vue', 'Yeux rouges', 'Lunettes',
  'Dépression', 'Stress', 'Anxiété', 'Migraine', 'Mal de dos', 'Fracture', 'Nutrition', 'Poids', 'Bilan de santé',
  'Bébé', 'Enfant malade', 'Cœur', 'Asthme', 'VIH', 'Hépatite', 'Typhoïde', 'Drépanocytose', 'Hygiène', 'Eau potable',
];
const TOPIC_KEYS = new Set(TOPICS.map(fold));

/**
 * Niveau de correspondance d'un libellé avec la saisie : 3 = le libellé commence par la saisie, 2 = un de ses mots
 * commence par la saisie, 1 = la saisie apparaît dedans (à partir de 3 lettres), 0 = aucune. Une seule lettre : seul
 * le début du libellé compte, pour des propositions précises.
 */
export function matchLevel(label: string, text: string): number {
  const t = fold(text);
  const l = fold(label);
  if (!t) return 0;
  if (l.startsWith(t)) return 3;
  if (t.length < 2) return 0;
  if (l.split(/[^a-z0-9]+/).some((w) => w.startsWith(t))) return 2;
  return t.length >= 3 && l.includes(t) ? 1 : 0;
}

/** Les éléments qui correspondent, les meilleurs d'abord (puis par ordre alphabétique). */
export function suggest<T>(text: string, items: T[], label: (x: T) => string, extra?: (x: T) => string): T[] {
  return items
    // Les mots-clés cachés ne comptent qu'à partir de 2 lettres, et jamais plus qu'un mot du libellé.
    .map((x) => ({ x, n: Math.max(matchLevel(label(x), text), extra && fold(text).length >= 2 ? Math.min(2, matchLevel(extra(x), text)) : 0) }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n || label(a.x).localeCompare(label(b.x)))
    .map((r) => r.x);
}

/** Thématiques correspondant à la saisie, dès la première lettre. */
export const suggestTopics = (text: string) => suggest(text, TOPICS, (x) => x);

/** Spécialités correspondant à la saisie : par leur nom, ou par un mot courant qui commence par la saisie (2 lettres et plus). */
export const suggestSpecialties = (text: string, specialties: Specialty[]) =>
  suggest(text, specialties, (s) => s.nameFr, (s) => `${s.nameEn} ${(SYNONYMS[s.code] ?? []).join(' ')}`);

/** La recherche désigne-t-elle exactement une spécialité (son nom ou un métier, pas une maladie ni un symptôme) ? */
export function exactSpecialty(text: string, specialties: Specialty[]): Specialty | null {
  const t = fold(text);
  if (!t || TOPIC_KEYS.has(t)) return null;
  return specialties.find((s) => fold(s.nameFr) === t || fold(s.nameEn) === t || (SYNONYMS[s.code] ?? []).includes(t)) ?? null;
}

/** Spécialités liées à la recherche : par leur nom, ou par un mot courant présent dans la phrase. */
export function matchSpecialties(text: string, specialties: Specialty[]): Specialty[] {
  const t = fold(text);
  if (t.length < 2) return [];
  const words = t.split(/[^a-z0-9]+/).filter(Boolean);
  return specialties.filter((s) => {
    if ([fold(s.nameFr), fold(s.nameEn)].some((name) => name.includes(t) || t.includes(name))) return true;
    return (SYNONYMS[s.code] ?? []).some((w) => w.startsWith(t) || words.includes(w) || (w.includes(' ') && t.includes(w)));
  });
}

const STOP = new Set(['les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'est', 'que', 'qui', 'mon', 'mes', 'votre', 'vos', 'comment', 'quoi', 'quel', 'quelle', 'faire', 'pas', 'aux', 'par', 'plus', 'son', 'ses']);
const terms = (text: string) => fold(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));

/** Score d'un texte : nombre de mots de la recherche qu'il contient (début de mot accepté : « rembours » → « remboursement »). */
function score(query: string[], text: string): number {
  const words = fold(text).split(/[^a-z0-9]+/);
  return query.filter((q) => words.some((w) => w.startsWith(q) || (q.length > 4 && q.startsWith(w) && w.length >= 4))).length;
}

export function rank<T>(text: string, items: T[], content: (x: T) => string): T[] {
  const q = terms(text);
  if (!q.length) return [];
  return items.map((x) => ({ x, s: score(q, content(x)) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => r.x);
}

/** Spécialités proposées avant toute saisie, des plus demandées aux moins demandées. */
const FREQUENT = ['GENERAL_PRACTICE', 'PEDIATRICS', 'GYNECOLOGY', 'CARDIOLOGY', 'DENTISTRY', 'OPHTHALMOLOGY', 'DERMATOLOGY', 'ENT'];
export const frequentSpecialties = (specialties: Specialty[]) =>
  FREQUENT.map((code) => specialties.find((s) => s.code === code)).filter((s): s is Specialty => !!s);
