import { AuthApiError, issueApiKey } from "./authApi";
import type { AuthClient } from "./firebase";
import {
  getLoadedAuthClient,
  isAuthConfigured as _isAuthConfigured,
  loadAuthClient,
  preloadAuthClient,
} from "./firebase";

export function isAuthConfigured(): boolean {
  return _isAuthConfigured();
}

export function prepareAuthPopup(): void {
  preloadAuthClient();
}

function isPopupFailure(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  return (
    code === "auth/popup-blocked" ||
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  );
}

async function runSignIn(client: AuthClient): Promise<void> {
  try {
    if (client.currentUser()) await client.signOut();
    await client.signIn();
  } catch (error) {
    if (isPopupFailure(error))
      throw new Error(
        "ポップアップがブロックされました。ブラウザのポップアップを許可してから再度お試しください。",
      );
    throw error;
  }
}

function needsRecentSignIn(error: unknown): boolean {
  return (
    error instanceof AuthApiError &&
    error.status === 401 &&
    (error.code === "RECENT_SIGN_IN_REQUIRED" ||
      error.code === "UNAUTHORIZED" ||
      error.code === "INVALID_AUTHORIZATION")
  );
}

async function issueAndReturn(client: AuthClient): Promise<string> {
  const idToken = await client.getIdToken();
  try {
    return await issueApiKey(idToken);
  } catch (error) {
    if (!needsRecentSignIn(error))
      throw new Error("APIキーの発行に失敗しました。もう一度お試しください。");
    await runSignIn(client);
    try {
      return await issueApiKey(await client.getIdToken());
    } catch {
      throw new Error("APIキーの発行に失敗しました。もう一度お試しください。");
    }
  }
}

/** Opens a Google sign-in popup and returns a newly issued `tkp_` API key.
 *  Returns null when auth is not configured (env vars missing). */
export async function issueApiKeyViaPopup(): Promise<string | null> {
  let client = getLoadedAuthClient();
  if (!client) {
    const pending = loadAuthClient();
    if (!pending) return null;
    client = await pending;
  }
  await runSignIn(client);
  return issueAndReturn(client);
}
