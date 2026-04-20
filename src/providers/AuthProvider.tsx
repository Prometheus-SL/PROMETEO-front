import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser, Tokens } from "@/services/auth";

export interface AuthContextValue {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  login: (username: string, password: string, totpToken?: string) => Promise<void>;
  loginQR: (tokens: Tokens, user: AuthUser) => Promise<void>;
  updateUser?: (user: AuthUser) => void;
  logout: () => void;
  register: (
    username: string,
    email: string,
    password: string,
    name: string,
    surname: string,
    birthday: string,
  ) => Promise<void>;
  loading: boolean;
  error: string | null;
  twoFactorRequired?: boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: AuthContextValue;
}) {
  if (value) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  return <LiveAuthProvider>{children}</LiveAuthProvider>;
}

function LiveAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext debe usarse dentro de <AuthProvider>");
  return ctx;
}
