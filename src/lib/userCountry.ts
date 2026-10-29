import { getProfile } from '../api/endpoints';
import { countryStore } from '../auth/storage';

/**
 * Pays du compte connecté, pour afficher les actualités de ce pays : celui du patient (s'il l'a renseigné),
 * du médecin ou de la structure ; à défaut, le pays choisi sur l'écran d'ouverture ; sinon null (tous les pays).
 */
export async function userCountry(): Promise<string | null> {
  try {
    const p = await getProfile();
    // Pays du compte calculé par le serveur (profil, sinon indicatif du numéro pour une connexion par SMS).
    const code = p.countryCode ?? p.patient?.countryCode ?? p.practitioner?.countryCode ?? p.structure?.countryCode;
    if (code) return code;
  } catch {
    // profil indisponible : on se rabat sur le choix de l'écran d'ouverture
  }
  return countryStore.load();
}
