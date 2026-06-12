export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
};

export function successResponse<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function errorResponse(message: string, details?: unknown): ApiFailure {
  return {
    success: false,
    error: { message, details },
  };
}
