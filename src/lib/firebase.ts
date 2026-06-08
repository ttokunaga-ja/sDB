// Lazy Firebase Auth boundary. Firebase SDK only loads when auth is configured
// and the user clicks the Google sign-in button — kept out of the main bundle
// via a dynamic import of ./firebaseImpl. Auth is "configured" only when all
// VITE_FIREBASE_* values are present; when unconfigured, the button is hidden.

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export interface AuthClient {
  currentUser(): AuthUser | null;
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signIn(): Promise<AuthUser>;
  reauthenticate(): Promise<AuthUser>;
  signOut(): Promise<void>;
  getIdToken(): Promise<string>;
}

function readConfig(): FirebaseWebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };
}

const config = readConfig();

export function isAuthConfigured(): boolean {
  return config !== null;
}

let clientPromise: Promise<AuthClient> | null = null;
let loadedClient: AuthClient | null = null;

export function getLoadedAuthClient(): AuthClient | null {
  return loadedClient;
}

export function loadAuthClient(): Promise<AuthClient> | null {
  if (!config) return null;
  if (!clientPromise) {
    clientPromise = import("./firebaseImpl")
      .then((m) => {
        loadedClient = m.createAuthClient(config);
        return loadedClient;
      })
      .catch((error: unknown) => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}

export function preloadAuthClient(): void {
  void loadAuthClient()?.catch(() => {
    // Preloading errors are ignored; the button click will surface them.
  });
}
