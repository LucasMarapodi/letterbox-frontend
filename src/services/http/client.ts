import { readCatalogMetadata, type CatalogMetadata } from '../catalogMetadata';
export type FetchTransport = (input: string, init: RequestInit) => Promise<Response>;
export type HttpFailureKind = 'network' | 'http' | 'contract' | 'cancelled' | 'configuration';
export class HttpFailure extends Error {
  constructor(public readonly kind: HttpFailureKind, public readonly status?: number, public readonly code?: string) {
    super({ network: 'Não foi possível acessar a API.', http: 'A API recusou a operação.', contract: 'Resposta incompatível da API.', cancelled: 'Operação cancelada.', configuration: 'Configuração HTTP inválida.' }[kind]);
    this.name = 'HttpFailure';
  }
}
export interface HttpRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: readonly string[];
  query?: Readonly<Record<string, string | number | undefined>>;
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
  acceptedStatuses?: readonly number[];
  root?: boolean;
  onCatalogMetadata?: (metadata: CatalogMetadata | null) => void;
}
export interface HttpClient { request(input: HttpRequest): Promise<unknown>; }
export function validateApiBaseUrl(baseUrl: string): string {
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new HttpFailure('configuration'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new HttpFailure('configuration');
  return url.href.replace(/\/+$/, '');
}
function isApiError(value: unknown): value is { code: string; message: string } {
  return typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string' &&
    ['validation_failed','unauthorized','forbidden','not_found','conflict','internal_error','http_error','integration_unavailable','integration_invalid_response','integration_timeout','storage_unavailable'].includes(value.code) && 'message' in value && typeof value.message === 'string';
}
export function createHttpClient(baseUrl: string, transport: FetchTransport = (url, init) => fetch(url, init)): HttpClient {
  const base = validateApiBaseUrl(baseUrl);
  return { async request(input) {
    if (input.signal?.aborted) throw new HttpFailure('cancelled');
    if (!input.path.length || input.path.some((part) => !part || part === '.' || part === '..')) throw new HttpFailure('configuration');
    const path = input.path.map(encodeURIComponent).join('/');
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(input.query ?? {})) if (value !== undefined) query.set(key, String(value));
    const url = `${base}${input.root ? '' : '/api/v1'}/${path}${query.size ? `?${query}` : ''}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (input.token !== undefined) headers.Authorization = `Bearer ${input.token}`;
    if (input.body !== undefined) headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await transport(url, { method: input.method ?? 'GET', headers, signal: input.signal, credentials: 'omit', redirect: 'error', ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }) });
    } catch (error: unknown) {
      if (input.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw new HttpFailure('cancelled');
      throw new HttpFailure('network');
    }
    if (input.signal?.aborted) throw new HttpFailure('cancelled');
    if (response.status === 204) return undefined;
    let payload: unknown;
    try { payload = await response.json(); } catch {
      if (input.signal?.aborted) throw new HttpFailure('cancelled');
      throw new HttpFailure('contract', response.status);
    }
    if (!response.ok && !input.acceptedStatuses?.includes(response.status)) {
      if (!isApiError(payload)) throw new HttpFailure('contract', response.status);
      throw new HttpFailure('http', response.status, payload.code);
    }
    input.onCatalogMetadata?.(readCatalogMetadata(response.headers));
    return payload;
  } };
}
