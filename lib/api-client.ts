import type { ApiErrorBody } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5201";

export class ApiException extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Transport = (path: string, init?: RequestInit) => Promise<Response>;

/**
 * PATRÓN DECORATOR.
 * El transporte es una función; los decoradores la envuelven para agregar
 * logging y reintentos sin tocar el `fetch` original. Se pueden apilar.
 */
const withLogging = (next: Transport): Transport => async (path, init) => {
  const started = performance.now();
  const method = init?.method ?? "GET";
  try {
    const response = await next(path, init);
    console.debug(`[api] ${method} ${path} -> ${response.status} (${Math.round(performance.now() - started)} ms)`);
    return response;
  } catch (error) {
    console.error(`[api] ${method} ${path} falló`, error);
    throw error;
  }
};

const withRetry = (next: Transport, attempts = 2): Transport => async (path, init) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await next(path, init);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  }

  throw lastError;
};

/**
 * PATRÓN SINGLETON.
 * Una sola instancia del cliente para toda la aplicación: un único punto de
 * configuración de la URL base, cabeceras y decoradores del transporte.
 */
export class ApiClient {
  private static instance: ApiClient | null = null;

  private readonly transport: Transport;
  readonly baseUrl: string;

  private constructor(baseUrl: string) {
    this.baseUrl = baseUrl;

    const raw: Transport = (path, init) =>
      fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });

    // Decoradores aplicados en orden: primero reintentos, luego logging.
    this.transport = withLogging(withRetry(raw));
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(BASE_URL);
    }

    return ApiClient.instance;
  }

  async get<T>(path: string): Promise<T> {
    return this.parse<T>(await this.transport(path, { method: "GET", cache: "no-store" }));
  }

  async send<T>(method: "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
    return this.parse<T>(
      await this.transport(path, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }

  private async parse<T>(response: Response): Promise<T> {
    const text = await response.text();

    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const body = (payload ?? {}) as ApiErrorBody;
      throw new ApiException(
        response.status,
        body.error ?? "ERROR",
        body.message ?? `La petición falló con estado ${response.status}.`,
        body.details,
      );
    }

    return payload as T;
  }
}

export const apiClient = ApiClient.getInstance();

/** Convierte un error desconocido en un mensaje legible para la interfaz. */
export const describeError = (error: unknown): string => {
  if (error instanceof ApiException) {
    if (Array.isArray(error.details)) {
      const fieldErrors = (error.details as { field: string; message: string }[])
        .map((item) => `${item.field}: ${item.message}`)
        .join(" ");
      if (fieldErrors) return `${error.message} ${fieldErrors}`;
    }

    return error.message;
  }

  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
};
