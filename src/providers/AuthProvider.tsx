import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser, Tokens } from "@/services/auth";

export interface AuthContextValue {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  loginQR: (tokens: Tokens, user: AuthUser) => Promise<void>;
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
  const auth = value ?? useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext debe usarse dentro de <AuthProvider>");
  return ctx;
}
