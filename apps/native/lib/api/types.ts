export type ApiErrorDetails = {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
};

export class ApiError extends Error {
  status: number;
  details?: ApiErrorDetails;

  constructor(status: number, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};
