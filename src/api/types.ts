export type Role = 'PATIENT' | 'PRACTITIONER' | 'ADMIN' | 'STRUCTURE';
export type AppointmentMode = 'IN_PERSON' | 'VIDEO';
/** ONLINE : Mobile Money à la réservation ; ON_SITE : réglé au cabinet ; FREE : sans tarif. */
export type PaymentMode = 'ONLINE' | 'ON_SITE' | 'FREE';
export type AppointmentStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface UserResponse {
  id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  locale: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserResponse;
}

export interface Country {
  code: string;
  nameFr: string;
  nameEn: string;
  currency: string;
  dialCode: string;
  /** Numéro d'urgence médicale vérifié par l'administrateur (null = non renseigné). */
  emergencyNumber: string | null;
  /** Tarif d'une consultation (unités mineures), null = non défini. */
  defaultFeeMinor?: number | null;
  /** Moyens de paiement proposés à la réservation (réglés pays par pays dans le centre d'administration). */
  onlinePayment?: boolean;
  onSitePayment?: boolean;
}

/** Moyen de paiement choisi par le patient à la réservation. */
export type PaymentMethod = 'MOBILE_MONEY' | 'ON_SITE';

/** Réglages publics de l'application (vide = bouton masqué). */
export interface AppConfig {
  whatsappNumber: string | null;
  whatsappHours: string | null;
}

export interface Specialty {
  code: string;
  nameFr: string;
  nameEn: string;
}

export interface PractitionerSummary {
  id: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  specialties: Specialty[];
  consultationFeeMinor: number | null;
  feeCurrency: string | null;
  teleconsultationEnabled: boolean;
  bio: string | null;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Slot {
  startsAt: string;
  endsAt: string;
  mode: AppointmentMode;
  facilityId: string | null;
}

export interface Appointment {
  id: string;
  practitionerId: string;
  practitionerName: string;
  practitionerCountryCode: string;
  patientId: string;
  patientName: string;
  facilityId: string | null;
  facilityName: string | null;
  mode: AppointmentMode;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason: string | null;
  videoRoom: string | null;
  priceMinor: number | null;
  priceCurrency: string | null;
  paymentMode: PaymentMode;
  /** Rendez-vous pris pour un proche : son nom (repris dans patientName). */
  relativeName?: string | null;
}

export interface AvailabilityRule {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  mode: AppointmentMode;
  facilityId: string | null;
  validFrom: string;
  validUntil: string | null;
}

export interface Facility {
  id: string;
  name: string;
  countryCode: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
}

export type NewsAudience = 'ALL' | 'PATIENT' | 'PRACTITIONER';

export interface News {
  id: string;
  title: string;
  body: string | null;
  /** Chemin sur l'API (/media/…) ou adresse https complète. */
  imageUrl: string | null;
  linkUrl: string | null;
  videoUrl: string | null;
  /** null = toute l'Afrique. */
  countryCode: string | null;
  audience: NewsAudience;
  publishedAt: string;
}

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface AdminPractitioner {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  countryCode: string;
  licenseNumber: string;
  specialties: Specialty[];
  verificationStatus: VerificationStatus;
}

export interface Training {
  id: string;
  title: string;
  description: string | null;
  format: 'ONLINE' | 'IN_PERSON';
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  linkUrl: string | null;
  countryCode: string | null;
  specialtyCode: string | null;
}

export interface FaqEntry {
  id: string;
  questionFr: string;
  answerFr: string;
  questionEn: string | null;
  answerEn: string | null;
}

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

export interface Payment {
  id: string;
  appointmentId: string;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  operator: string | null;
  failureCode: string | null;
  appointmentStatus: AppointmentStatus;
}

/** Opérateur Mobile Money (code PawaPay, ex. ORANGE_SEN). */
export interface PaymentOperator {
  code: string;
  name: string;
  currency: string;
}

export interface CancellationPreview {
  paid: boolean;
  refundPercent: number;
  refundMinor: number;
  currency: string | null;
}

// ----- structures (hôpital, clinique, cabinet, association, ONG…) -----
export type OrganizationType =
  | 'HOSPITAL'
  | 'CLINIC'
  | 'MEDICAL_PRACTICE'
  | 'HEALTH_CENTER'
  | 'ASSOCIATION'
  | 'NGO'
  | 'OTHER';

export const ORG_TYPES: OrganizationType[] = [
  'HOSPITAL',
  'CLINIC',
  'MEDICAL_PRACTICE',
  'HEALTH_CENTER',
  'ASSOCIATION',
  'NGO',
  'OTHER',
];

export interface StructureProfile {
  id: string;
  type: OrganizationType;
  name: string;
  countryCode: string;
  city: string | null;
  address: string | null;
  email: string;
  phone: string;
  domain: string | null;
  registrationNumber: string;
  contactName: string;
  contactRole: string | null;
  beds: number | null;
  verificationStatus: VerificationStatus;
  commissionPercent: number | null;
  createdAt: string;
}

export type MemberStatus = 'INVITED' | 'ACTIVE';

export interface StructureMember {
  practitionerId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  specialties: Specialty[];
  verificationStatus: VerificationStatus;
  status: MemberStatus;
  since: string;
}

/** Invitation ou rattachement d'un médecin à une structure. */
export interface Membership {
  organizationId: string;
  name: string;
  type: OrganizationType;
  city: string | null;
  status: MemberStatus;
}

// ----- Compte : profil du titulaire -----
export type Sex = 'FEMALE' | 'MALE' | 'OTHER';

export interface Profile {
  id: string;
  role: Role;
  email: string | null;
  phone: string | null;
  locale: string;
  /** false pour les comptes créés par SMS : pas de mot de passe à modifier. */
  hasPassword: boolean;
  /** Pays du compte : tout ce qu'il voit et réserve est limité à ce pays (null : pas encore connu). */
  countryCode: string | null;
  /** Double authentification (code e-mail sur un nouvel appareil) et préférences de rappel. */
  twoStepEnabled: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  patient: {
    firstName: string | null;
    lastName: string | null;
    birthDate: string | null;
    sex: Sex | null;
    countryCode: string | null;
    city: string | null;
    address: string | null;
  } | null;
  practitioner: {
    firstName: string;
    lastName: string;
    countryCode: string;
    licenseNumber: string | null;
    bio: string | null;
    specialties: { code: string; nameFr: string; nameEn: string }[];
    verificationStatus: VerificationStatus;
    teleconsultationEnabled: boolean;
  } | null;
  structure: {
    name: string;
    type: string;
    countryCode: string;
    city: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    contactName: string | null;
    verificationStatus: VerificationStatus;
  } | null;
}

export type ProfileUpdate = Partial<{
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: Sex;
  countryCode: string;
  city: string;
  address: string;
  bio: string;
  teleconsultationEnabled: boolean;
  locale: string;
  twoStepEnabled: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
}>;

/** Mes proches : personnes pour qui le titulaire prend rendez-vous. */
export type Relation = 'CHILD' | 'PARENT' | 'SPOUSE' | 'OTHER';
export interface Relative {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  sex: Sex | null;
  relation: Relation;
}
export type RelativeInput = Omit<Relative, 'id'>;

// ----- Compte : paiements et reçus -----
export interface BillingItem {
  appointmentId: string;
  paymentId: string | null;
  date: string;
  appointmentAt: string;
  practitioner: string;
  facility: string | null;
  amountMinor: number;
  currency: string;
  method: 'MOBILE_MONEY' | 'ON_SITE';
  status: 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'PENDING' | 'ON_SITE';
  refundedMinor: number;
  operator: string | null;
  receiptNumber: string | null;
}

export interface ProBilling {
  commissionPercent: number;
  month: string;
  monthTotals: { currency: string; onlineCount: number; grossMinor: number; commissionMinor: number; netMinor: number }[];
  onSiteThisMonth: number;
  payouts: {
    id: string;
    periodEnd: string;
    currency: string;
    grossMinor: number;
    commissionMinor: number;
    amountMinor: number;
    status: 'DUE' | 'PAID';
    paidAt: string | null;
    reference: string | null;
  }[];
  payments: {
    id: string;
    date: string;
    appointmentAt: string;
    patient: string;
    practitioner: string;
    amountMinor: number;
    refundedMinor: number;
    commissionMinor: number;
    netMinor: number;
    currency: string;
    status: string;
    inPayout: boolean;
  }[];
}

export interface Billing {
  role: Role;
  /** Patient : ce qu'il paie, sans commission. */
  patient: {
    countryCode: string | null;
    methods: PaymentMethod[];
    lastMobileMoney: { operator: string | null; phone: string | null } | null;
    items: BillingItem[];
  } | null;
  /** Médecin ou structure : encaissements, commission, net et reversements. */
  pro: ProBilling | null;
}
