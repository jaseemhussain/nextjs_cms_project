import { clearToken, getToken } from "@/lib/auth-storage";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ApiOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

/**
 * Browser se APIs call karne ka helper.
 * auth: true → Authorization: Bearer <token>
 */
export async function apiClient<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.auth !== false) {
    const token = getToken();
    if (!token) {
      throw new ApiClientError("Not logged in", 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }
    throw new ApiClientError(
      data.message ?? `Request failed (${response.status})`,
      response.status
    );
  }

  return data as T;
}
