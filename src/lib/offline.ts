import { Directory, File, Paths } from 'expo-file-system';

/**
 * Mémoire hors connexion : la dernière réponse reçue pour chaque lecture (pays, médecins, actualités, aide, mes
 * rendez-vous…) est gardée sur le téléphone. Sans réseau, ou si le réseau est trop lent, l'application l'affiche
 * au lieu d'une erreur. Tout est effacé à la déconnexion (le téléphone peut être partagé).
 */
const dir = new Directory(Paths.document, 'hors-connexion');

const fileFor = (path: string) => new File(dir, `${path.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 180)}.json`);

export async function remember(path: string, data: unknown): Promise<void> {
  try {
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const file = fileFor(path);
    if (!file.exists) file.create();
    file.write(JSON.stringify(data));
  } catch {
    // mémoire non critique : on continue sans
  }
}

export async function recall(path: string): Promise<{ data: unknown } | null> {
  try {
    const file = fileFor(path);
    if (!file.exists) return null;
    return { data: JSON.parse(await file.text()) };
  } catch {
    return null;
  }
}

export function forgetAll(): void {
  try {
    if (dir.exists) dir.delete();
  } catch {
    // rien à effacer
  }
}

// ----- état « hors connexion » (bandeau discret) -----
let offline = false;
const listeners = new Set<(v: boolean) => void>();

export function setOffline(value: boolean): void {
  if (offline === value) return;
  offline = value;
  listeners.forEach((l) => l(value));
}

export function onOfflineChange(listener: (v: boolean) => void): () => void {
  listeners.add(listener);
  listener(offline);
  return () => {
    listeners.delete(listener);
  };
}
