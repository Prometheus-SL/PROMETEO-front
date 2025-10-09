import { PrivateRoute } from "./routes/PrivateRoute";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import AppLayout from "./layouts/AppLayout";

export const appRoutes = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/",
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    handle: {
      // Menú por defecto del layout
      navMain: [
        { title: "Home", url: "/" },
      ],
    },
    children: [
      {
        index: true,
        element: <HomePage />,
        handle: { title: "Home" },
      }
    ],
  },
  // Puedes añadir más rutas aquí
];
