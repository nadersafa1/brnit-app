import { env } from "@brnit/env/native";
import { authClient } from "@/lib/auth-client";
import { ApiError, type ApiFetchOptions, type ApiErrorDetails } from "./types";

type ApiResponseBody = {
  error?: string;
  details?: ApiErrorDetails;
};

function getBaseURL(): string {
  if (!env.EXPO_PUBLIC_SERVER_URL) {
    throw new Error("EXPO_PUBLIC_SERVER_URL is not set");
  }
  return env.EXPO_PUBLIC_SERVER_URL;
}

function serializeBody(body: unknown, isFormData: boolean): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (isFormData) return body as FormData;
  return JSON.stringify(body);
}

export async function apiFetch<TResponse>(
  path: string,
  { method = "GET", body, headers, signal }: ApiFetchOptions = {}
): Promise<TResponse> {
  const baseUrl = getBaseURL();
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const cookie = authClient.getCookie();

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    body: serializeBody(body, isFormData),
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    credentials: "omit",
    signal,
  });

  const json: ApiResponseBody | TResponse | undefined = await response
    .json()
    .catch(() => undefined);

  if (!response.ok) {
    const responseBody = json as ApiResponseBody | undefined;
    const errorMessage =
      responseBody?.error ||
      `Request failed with ${response.status} ${response.statusText}`;

    throw new ApiError(response.status, errorMessage, responseBody?.details);
  }

  return json as TResponse;
}
