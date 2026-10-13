export type FetchTransport = (input: string, init: RequestInit) => Promise<Response>;
export type HttpFailureKind = 'network' | 'http' | 'contract' | 'cancelled' | 'configuration';
export class HttpFailure extends Error {
  constructor(public readonly kind: HttpFailureKind, public readonly status?: number, public readonly code?: string) { super('Falha no transporte HTTP.'); }
}
export interface HttpRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: readonly string[];
  query?: Readonly<Record<string, string | number | undefined>>;
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
  root?: boolean;
}
export interface HttpClient { request(input: HttpRequest): Promise<unknown>; }
export function createHttpClient(baseUrl: string, transport?: FetchTransport): HttpClient {
  void baseUrl; void transport;
  return { async request() { throw new HttpFailure('configuration'); } };
}
