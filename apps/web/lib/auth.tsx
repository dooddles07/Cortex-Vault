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

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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
    async (email: string, password: string) => {
      const { access_token } = await api.signIn(email, password);
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
    // Tokens are stateless, so this only clears the client. The token stays
    // valid server-side until it expires.
    setToken(null);
    setUser(null);
    router.push("/sign-in");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
