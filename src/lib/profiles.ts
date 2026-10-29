/** Profils proposés à l'ouverture de l'application. */
export type Profile = 'patient' | 'practitioner' | 'structure';

export const PROFILES: Profile[] = ['patient', 'practitioner', 'structure'];

/** Écran d'inscription propre à chaque profil. */
export function registerRoute(profile: Profile): string {
  if (profile === 'practitioner') return 'PractitionerRegister';
  if (profile === 'structure') return 'StructureRegister';
  return 'EmailRegister';
}

/** Le patient reçoit un code SMS ; médecins et structures utilisent leur numéro avec leur mot de passe. */
export function phoneUsesPassword(profile: Profile | undefined): boolean {
  return profile === 'practitioner' || profile === 'structure';
}
