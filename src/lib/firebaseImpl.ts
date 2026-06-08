import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import type { AuthClient, AuthUser, FirebaseWebConfig } from "./firebase";

function toUser(u: User | null): AuthUser | null {
  return u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null;
}

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function requireUser(user: User | null): AuthUser {
  const mapped = toUser(user);
  if (!mapped) throw new Error("sign-in returned no user");
  return mapped;
}

export function createAuthClient(config: FirebaseWebConfig): AuthClient {
  const app = initializeApp(config);
  const auth = getAuth(app);
  return {
    currentUser: () => toUser(auth.currentUser),
    onChange: (cb) => onAuthStateChanged(auth, (u) => cb(toUser(u))),
    signIn: async () => {
      const result = await signInWithPopup(auth, googleProvider());
      return requireUser(result.user);
    },
    reauthenticate: async () => {
      const current = auth.currentUser;
      if (!current) {
        const result = await signInWithPopup(auth, googleProvider());
        return requireUser(result.user);
      }
      const result = await reauthenticateWithPopup(current, googleProvider());
      return requireUser(result.user);
    },
    signOut: () => signOut(auth),
    getIdToken: async () => {
      const current = auth.currentUser;
      if (!current) throw new Error("not signed in");
      return current.getIdToken(true);
    },
  };
}
