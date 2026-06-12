type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function buildApiUrl(path: string) {
  if (path.startsWith("supabase://")) {
    return `${apiBaseUrl}/api/uploads/media?ref=${encodeURIComponent(path)}`;
  }
  if (!apiBaseUrl || /^(https?:|data:|blob:)/i.test(path)) return path;
  return `${apiBaseUrl}${path}`;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(buildApiUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const body = response.status === 204 ? ({ success: true, data: undefined as T } as ApiSuccess<T>) : ((await response.json()) as ApiResponse<T>);

  if (!response.ok || !body.success) {
    throw new Error(body.success ? "Request failed" : body.error.message);
  }

  return body.data;
}
