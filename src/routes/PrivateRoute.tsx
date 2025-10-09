import { useAuthContext } from "@/providers/AuthProvider";
import { Navigate, useLocation } from "react-router-dom";

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthContext();
  const location = useLocation();
  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
