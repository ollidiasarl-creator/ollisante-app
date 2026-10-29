import { File } from 'expo-file-system';
import { deviceStore } from '../auth/storage';
import { request } from './client';
import type {
  AdminPractitioner,
  AppConfig,
  Appointment,
  AppointmentMode,
  AuthResponse,
  AvailabilityRule,
  Billing,
  CancellationPreview,
  Country,
  Facility,
  FaqEntry,
  Membership,
  News,
  NewsAudience,
  OrganizationType,
  PageResponse,
  Payment,
  PaymentOperator,
  PractitionerSummary,
  Slot,
  Specialty,
  StructureMember,
  StructureProfile,
  Training,
  PaymentMethod,
  Profile,
  ProfileUpdate,
  Relative,
  RelativeInput,
  UserResponse,
  VerificationStatus,
} from './types';

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

// ----- authentification (publique) -----
export const requestOtp = (phone: string, locale: string) =>
  request<{ expiresInSeconds: number }>('/api/v1/auth/otp/request', {
    method: 'POST',
    body: { phone, locale },
    auth: false,
  });

export const verifyOtp = (input: {
  phone: string;
  code: string;
  firstName?: string;
  lastName?: string;
  locale: string;
}) => request<AuthResponse>('/api/v1/auth/otp/verify', { method: 'POST', body: input, auth: false });

/** Code e-mail demandé après un mot de passe correct (réponse 202) : administrateurs, et comptes ayant activé la double authentification. */
export interface LoginChallenge {
  verificationRequired: true;
  challengeId: string;
  emailHint: string;
}

export const isLoginChallenge = (r: AuthResponse | LoginChallenge): r is LoginChallenge =>
  (r as LoginChallenge).verificationRequired === true;

export const loginWithPassword = async (identifier: string, password: string) =>
  request<AuthResponse | LoginChallenge>('/api/v1/auth/login', {
    method: 'POST',
    body: { identifier, password, deviceToken: await deviceStore.load() },
    auth: false,
  });

/** Code reçu par e-mail ; le téléphone devient « de confiance » 30 jours (plus de code pendant ce temps). */
export const verifyAdminLogin = async (challengeId: string, code: string) => {
  const r = await request<{ auth: AuthResponse; deviceToken: string | null }>('/api/v1/auth/login/verify', {
    method: 'POST',
    body: { challengeId, code, rememberDevice: true },
    auth: false,
  });
  if (r.deviceToken) await deviceStore.save(r.deviceToken);
  return r;
};

export interface PatientSignup {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  locale: string;
}

/** Inscription patient par e-mail, étape 1 : un code est envoyé à l'adresse (le compte n'existe pas encore). */
export const startPatientSignup = (input: PatientSignup) =>
  request<{ expiresInSeconds: number }>('/api/v1/auth/register/patient/start', {
    method: 'POST',
    body: input,
    auth: false,
  });

/** Étape 2 : le bon code crée le compte et connecte le patient. */
export const verifyPatientSignup = (email: string, code: string) =>
  request<AuthResponse>('/api/v1/auth/register/patient/verify', {
    method: 'POST',
    body: { email, code },
    auth: false,
  });

export const registerPractitioner = (input: {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  licenseNumber: string;
  specialtyCodes: string[];
  locale: string;
}) => request<AuthResponse>('/api/v1/auth/register/practitioner', { method: 'POST', body: input, auth: false });

export const registerStructure = (input: {
  type: OrganizationType;
  name: string;
  countryCode: string;
  city?: string;
  address?: string;
  email: string;
  phone: string;
  domain?: string;
  registrationNumber: string;
  contactName: string;
  contactRole?: string;
  beds?: number;
  password: string;
  locale: string;
}) => request<AuthResponse>('/api/v1/auth/register/structure', { method: 'POST', body: input, auth: false });

export const forgotPassword = (email: string, locale: string) =>
  request<{ expiresInSeconds: number }>('/api/v1/auth/password/forgot', {
    method: 'POST',
    body: { email, locale },
    auth: false,
  });

export const resetPassword = (input: { email: string; code: string; newPassword: string }) =>
  request<AuthResponse>('/api/v1/auth/password/reset', { method: 'POST', body: input, auth: false });

export const logoutRequest = (refreshToken: string) =>
  request<null>('/api/v1/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });

// ----- données de référence (publiques) -----
export const getCountries = () => request<Country[]>('/api/v1/countries', { auth: false });
export const getAppConfig = () => request<AppConfig>('/api/v1/app-config', { auth: false });
export const getSpecialties = () => request<Specialty[]>('/api/v1/specialties', { auth: false });

// ----- recherche et créneaux (publics) -----
export const searchPractitioners = (params: {
  countryCode?: string | null;
  specialty?: string | null;
  q?: string;
  teleconsultation?: boolean | null;
  facilityId?: string | null;
  page?: number;
  size?: number;
}) => request<PageResponse<PractitionerSummary>>(`/api/v1/practitioners${query(params)}`, { auth: false });

export const getPractitioner = (id: string) =>
  request<PractitionerSummary>(`/api/v1/practitioners/${id}`, { auth: false });

export const getSlots = (
  id: string,
  params: { from?: string; to?: string; mode?: AppointmentMode; facilityId?: string | null },
) =>
  request<Slot[]>(`/api/v1/practitioners/${id}/slots${query(params)}`, { auth: false });

export const listFacilities = (countryCode?: string) =>
  request<Facility[]>(`/api/v1/facilities${query({ countryCode })}`, { auth: false });

/** Spécialités réservables dans un établissement (celles des praticiens qui y consultent). */
export const getFacilitySpecialties = (facilityId: string) =>
  request<Specialty[]>(`/api/v1/facilities/${facilityId}/specialties`, { auth: false });

// ----- actualités -----
export const getNews = (params: { countryCode?: string | null; page?: number; size?: number }) =>
  request<PageResponse<News>>(`/api/v1/news${query(params)}`);

export const createNews = (input: {
  title: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
  videoUrl?: string;
  countryCode?: string | null;
  audience: NewsAudience;
}) => request<News>('/api/v1/admin/news', { method: 'POST', body: input });

export const deleteNews = (id: string) => request<null>(`/api/v1/admin/news/${id}`, { method: 'DELETE' });

/** Envoie une image JPEG locale (file://…) ; renvoie son chemin public (/media/…). */
export function uploadImage(uri: string) {
  // Le fetch d'Expo attend un File d'expo-file-system (l'ancien { uri, name, type } n'est plus accepté).
  const form = new FormData();
  form.append('file', new File(uri) as unknown as Blob);
  return request<{ url: string }>('/api/v1/admin/media', { method: 'POST', body: form });
}

// ----- compte connecté -----
export const getMe = () => request<UserResponse>('/api/v1/me');
export const getProfile = () => request<Profile>('/api/v1/me/profile');
export const updateProfile = (input: ProfileUpdate) =>
  request<Profile>('/api/v1/me/profile', { method: 'PATCH', body: input });
export const getBilling = () => request<Billing>('/api/v1/me/billing');
export const getRelatives = () => request<Relative[]>('/api/v1/me/relatives');
export const addRelative = (input: RelativeInput) =>
  request<Relative>('/api/v1/me/relatives', { method: 'POST', body: input });
export const updateRelative = (id: string, input: RelativeInput) =>
  request<Relative>(`/api/v1/me/relatives/${id}`, { method: 'PATCH', body: input });
export const deleteRelative = (id: string) => request<null>(`/api/v1/me/relatives/${id}`, { method: 'DELETE' });
export const emailReceipt = (paymentId: string) =>
  request<null>(`/api/v1/me/billing/receipts/${paymentId}/email`, { method: 'POST', body: {} });
export const changePassword = (currentPassword: string, newPassword: string) =>
  request<null>('/api/v1/me/password', { method: 'POST', body: { currentPassword, newPassword } });

/** Suppression définitive du compte (anonymisation côté serveur). */
export const deleteAccount = () => request<null>('/api/v1/me', { method: 'DELETE' });

export const myAppointments = () => request<Appointment[]>('/api/v1/me/appointments');

export const bookAppointment = (input: {
  practitionerId: string;
  startsAt: string;
  mode: AppointmentMode;
  reason?: string;
  /** Moyen de paiement choisi parmi ceux activés pour le pays. */
  paymentMethod?: PaymentMethod;
  /** Rendez-vous pris pour l'un de ses proches. */
  relativeId?: string;
}) => request<Appointment>('/api/v1/appointments', { method: 'POST', body: input });

export const cancelAppointment = (id: string, reason?: string) =>
  request<Appointment>(`/api/v1/appointments/${id}/cancel`, { method: 'POST', body: { reason } });

// ----- praticien -----
export const listAvailabilityRules = () => request<AvailabilityRule[]>('/api/v1/me/availability-rules');

export const createAvailabilityRule = (input: {
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  mode: AppointmentMode;
  facilityId?: string;
}) => request<AvailabilityRule>('/api/v1/me/availability-rules', { method: 'POST', body: input });

export const deleteAvailabilityRule = (id: string) =>
  request<null>(`/api/v1/me/availability-rules/${id}`, { method: 'DELETE' });

export const createFacility = (input: { name: string; countryCode: string; city?: string; address?: string }) =>
  request<Facility>('/api/v1/facilities', { method: 'POST', body: input });

// ----- administration -----
export const adminPractitioners = (status: VerificationStatus) =>
  request<PageResponse<AdminPractitioner>>(`/api/v1/admin/practitioners${query({ status, size: 50 })}`);

export const setPractitionerVerification = (id: string, status: VerificationStatus) =>
  request<AdminPractitioner>(`/api/v1/admin/practitioners/${id}/verification`, { method: 'PATCH', body: { status } });

// ----- formations (professionnels) et FAQ -----
export const myTrainings = () => request<Training[]>('/api/v1/trainings');

export const getFaq = (audience: 'PATIENT' | 'PRACTITIONER') =>
  request<FaqEntry[]>(`/api/v1/faq${query({ audience })}`, { auth: false });

// ----- paiement Mobile Money -----
export const paymentOperators = (countryCode: string) =>
  request<PaymentOperator[]>(`/api/v1/payments/operators${query({ countryCode })}`);

export const payAppointment = (appointmentId: string, phone: string, operator: string) =>
  request<Payment>(`/api/v1/appointments/${appointmentId}/payments`, { method: 'POST', body: { phone, operator } });

export const getPayment = (id: string) => request<Payment>(`/api/v1/payments/${id}`);

export const cancellationPreview = (appointmentId: string) =>
  request<CancellationPreview>(`/api/v1/appointments/${appointmentId}/cancellation`);

// ----- structure connectée -----
export const structureProfile = () => request<StructureProfile>('/api/v1/structure/profile');

export const structureMembers = () => request<StructureMember[]>('/api/v1/structure/members');

export const inviteMember = (email: string) =>
  request<StructureMember>('/api/v1/structure/members', { method: 'POST', body: { email } });

export const removeMember = (practitionerId: string) =>
  request<null>(`/api/v1/structure/members/${practitionerId}`, { method: 'DELETE' });

export const structureAppointments = () => request<Appointment[]>('/api/v1/structure/appointments');

// ----- médecin : structures de rattachement -----
export const myOrganizations = () => request<Membership[]>('/api/v1/me/organizations');

export const acceptOrganization = (organizationId: string) =>
  request<Membership>(`/api/v1/me/organizations/${organizationId}/accept`, { method: 'POST' });

export const leaveOrganization = (organizationId: string) =>
  request<Membership>(`/api/v1/me/organizations/${organizationId}/leave`, { method: 'POST' });
