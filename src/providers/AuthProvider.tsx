import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser, Tokens } from "@/services/auth";

interface AuthContextProps {
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
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  // Solo memorizamos el objeto de auth
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext debe usarse dentro de <AuthProvider>");
  return ctx;
}
