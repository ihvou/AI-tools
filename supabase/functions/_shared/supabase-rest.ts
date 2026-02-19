type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

type Returning = "representation" | "minimal";

function toStringValue(value: QueryValue): string | null {
  if (value === undefined) return null;
  if (value === null) return "null";
  return String(value);
}

export class SupabaseRestClient {
  private baseUrl: string;
  private serviceRoleKey: string;

  constructor(input: { supabaseUrl: string; serviceRoleKey: string }) {
    this.baseUrl = input.supabaseUrl.replace(/\/$/, "");
    this.serviceRoleKey = input.serviceRoleKey;
  }

  private async request<T>(
    method: string,
    tableOrPath: string,
    options: {
      query?: QueryParams;
      body?: unknown;
      prefer?: string;
    } = {},
  ): Promise<T> {
    const path = tableOrPath.startsWith("/") ? tableOrPath : `/rest/v1/${tableOrPath}`;
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, rawValue] of Object.entries(options.query ?? {})) {
      const value = toStringValue(rawValue);
      if (value !== null) url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      "Content-Type": "application/json",
    };
    if (options.prefer) {
      headers.Prefer = options.prefer;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${method} ${url.pathname} failed (${response.status}): ${text}`);
    }
    if (!text) return [] as T;
    return JSON.parse(text) as T;
  }

  select<T>(table: string, query: QueryParams): Promise<T[]> {
    return this.request<T[]>("GET", table, { query });
  }

  upsert<T>(
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
    options: { onConflict: string; returning?: Returning },
  ): Promise<T[]> {
    const prefer = `resolution=merge-duplicates,return=${options.returning ?? "representation"}`;
    return this.request<T[]>("POST", table, {
      query: { on_conflict: options.onConflict },
      body: rows,
      prefer,
    });
  }

  insert<T>(
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
    returning: Returning = "representation",
  ): Promise<T[]> {
    return this.request<T[]>("POST", table, {
      body: rows,
      prefer: `return=${returning}`,
    });
  }

  update<T>(
    table: string,
    patch: Record<string, unknown>,
    filters: QueryParams,
    returning: Returning = "representation",
  ): Promise<T[]> {
    return this.request<T[]>("PATCH", table, {
      query: filters,
      body: patch,
      prefer: `return=${returning}`,
    });
  }

  remove<T>(table: string, filters: QueryParams, returning: Returning = "representation"): Promise<T[]> {
    return this.request<T[]>("DELETE", table, {
      query: filters,
      prefer: `return=${returning}`,
    });
  }
}
