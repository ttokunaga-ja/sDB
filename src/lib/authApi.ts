function baseUrl(): string {
  return (import.meta.env.VITE_AUTHAPI_URL ?? "").replace(/\/+$/, "");
}

export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function readAuthApiError(res: Response): Promise<AuthApiError> {
  try {
    const data = (await res.json()) as { code?: string; message?: string };
    return new AuthApiError(
      res.status,
      data.code ?? `HTTP_${res.status}`,
      data.message ?? `authAPI request failed: ${res.status}`,
    );
  } catch {
    return new AuthApiError(
      res.status,
      `HTTP_${res.status}`,
      `authAPI request failed: ${res.status}`,
    );
  }
}

/** POST /api/keys — rotates and returns a fresh `tkp_` API key. */
export async function issueApiKey(idToken: string): Promise<string> {
  const res = await fetch(`${baseUrl()}/api/keys`, {
    method: "POST",
    headers: { authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw await readAuthApiError(res);
  const data = (await res.json()) as { apiKey?: string | null };
  if (!data.apiKey) throw new Error("api key not returned");
  return data.apiKey;
}
