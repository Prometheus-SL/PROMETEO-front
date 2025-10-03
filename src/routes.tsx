import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import { PrivateRoute } from "./routes/PrivateRoute";

export const appRoutes = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <PrivateRoute>
        <HomePage />
      </PrivateRoute>
    ),
  },
  // Puedes añadir más rutas aquí
];
