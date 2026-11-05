import type { Facility, PractitionerSummary, Slot } from '../api/types';

/**
 * Horaire choisi par un visiteur avant de se connecter : gardé en mémoire le temps de la connexion (ou de
 * l'inscription), puis l'appli ouvre directement la confirmation de ce rendez-vous.
 */
export type PendingBooking = { practitioner: PractitionerSummary; slot: Slot; facility?: Facility };

let pending: PendingBooking | null = null;

export const setPendingBooking = (b: PendingBooking | null) => {
  pending = b;
};

/** Rend l'horaire en attente (une seule fois) et l'oublie ; null s'il n'y en a pas ou s'il est déjà passé. */
export const takePendingBooking = (): PendingBooking | null => {
  const b = pending;
  pending = null;
  if (b && new Date(b.slot.startsAt).getTime() < Date.now()) return null;
  return b;
};
