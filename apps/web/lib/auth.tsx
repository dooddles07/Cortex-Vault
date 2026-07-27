"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken, type User } from "@/lib/api";

/** Returned by signIn when the account has MFA enabled: no session exists
 * yet, and the caller must collect a code and call completeMfaChallenge. */
type MfaRequired = { mfaRequired: true; mfaToken: string };

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<MfaRequired | void>;
  completeMfaChallenge: (mfaToken: string, code: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const complete = useCallback(async (token: string) => {
    setToken(token);
    setUser(await api.me());
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<MfaRequired | void> => {
      const result = await api.signIn(email, password);
      if (result.mfa_required) {
        return { mfaRequired: true, mfaToken: result.mfa_token! };
      }
      await complete(result.access_token!);
    },
    [complete],
  );

  const completeMfaChallenge = useCallback(
    async (mfaToken: string, code: string) => {
      const { access_token } = await api.mfaChallenge(mfaToken, code);
      await complete(access_token);
    },
    [complete],
  );

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const { access_token } = await api.signUp(email, password, name);
      await complete(access_token);
    },
    [complete],
  );

  const signOut = useCallback(() => {
    // Revokes the session server-side. Best-effort: the client is cleared
    // either way, so a network failure here doesn't strand the user signed
    // in on this device — it just means that one session outlives it.
    api.signOut().catch(() => {});
    setToken(null);
    setUser(null);
    router.push("/sign-in");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, completeMfaChallenge, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

/** Redirects to sign-in when there is no session. Returns null while resolving. */
export function useRequireAuth(): User | null {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [loading, user, router]);

  return user;
}
