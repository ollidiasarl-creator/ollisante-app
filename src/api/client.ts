import { API_URL } from '../config';
import { tokenStore } from '../auth/storage';
import type { AuthResponse } from './types';
import { recall, remember, setOffline } from '../lib/offline';

/** Au-delà, une lecture abandonne le réseau et affiche la dernière réponse enregistrée (réseau lent ou coupé). */
const READ_TIMEOUT_MS = 12000;

export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string>;

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

let sessionExpiredHandler: (() => void) | null = null;

/** Appelé quand le renouvellement de session échoue : l'application revient à l'écran de connexion. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

function networkError(): ApiError {
  return new ApiError(0, 'RESEAU', 'Impossible de joindre le serveur.');
}

async function rawFetch(path: string, method: string, body: unknown, accessToken?: string, timeoutMs?: number): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const isForm = body instanceof FormData; // envoi de fichier : fetch fixe lui-même le Content-Type multipart
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: controller?.signal,
    });
  } catch {
    throw networkError();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (res.ok) return data;
  throw new ApiError(
    res.status,
    typeof data?.code === 'string' ? data.code : 'ERREUR',
    typeof data?.message === 'string' ? data.message : `Erreur ${res.status}`,
    data?.fieldErrors ?? undefined,
  );
}

type RefreshResult = 'ok' | 'expired' | 'network';
let refreshing: Promise<RefreshResult> | null = null;

/** Un seul renouvellement à la fois, même si plusieurs requêtes échouent en même temps. */
function refreshTokens(): Promise<RefreshResult> {
  if (refreshing) return refreshing;
  refreshing = (async (): Promise<RefreshResult> => {
    const tokens = await tokenStore.load();
    if (!tokens) return 'expired';
    let res: Response;
    try {
      res = await rawFetch('/api/v1/auth/refresh', 'POST', { refreshToken: tokens.refreshToken });
    } catch {
      return 'network';
    }
    if (!res.ok) return 'expired';
    const data = (await res.json()) as AuthResponse;
    await tokenStore.save({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return 'ok';
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  if (method !== 'GET') return send<T>(path, options);
  // Lectures : la réponse est gardée ; sans réseau (ou serveur injoignable), on affiche la dernière reçue.
  try {
    const data = await send<T>(path, options, READ_TIMEOUT_MS);
    setOffline(false);
    void remember(path, data);
    return data;
  } catch (e) {
    const unreachable = e instanceof ApiError && (e.status === 0 || e.status >= 502);
    if (unreachable) {
      const saved = await recall(path);
      if (saved) {
        setOffline(true);
        return saved.data as T;
      }
    }
    throw e;
  }
}

async function send<T>(path: string, options: RequestOptions, timeoutMs?: number): Promise<T> {
  const method = options.method ?? 'GET';
  const auth = options.auth ?? true;

  let tokens = auth ? await tokenStore.load() : null;
  let res = await rawFetch(path, method, options.body, tokens?.accessToken, timeoutMs);

  if (res.status === 401 && auth && tokens) {
    const result = await refreshTokens();
    if (result === 'ok') {
      tokens = await tokenStore.load();
      res = await rawFetch(path, method, options.body, tokens?.accessToken, timeoutMs);
    } else if (result === 'expired') {
      await tokenStore.clear();
      sessionExpiredHandler?.();
    } else {
      throw networkError();
    }
  }
  return (await parse(res)) as T;
}
