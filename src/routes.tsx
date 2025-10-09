import { PrivateRoute } from "./routes/PrivateRoute";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import AppLayout from "./layouts/AppLayout";
import NotFoundPage from "@/pages/404Page";
import UsersPage from "./pages/admin/UsersPage";

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
    handle: [
      {
        routes: [{ title: "Home", url: "/" }],
        adminOnly: false,
        title: "Principal",
      },
      {
        title: "Administración",
        routes: [{ title: "Users", url: "/admin/users" }],
        adminOnly: true,
      },
    ],
    children: [
      {
        index: true,
        element: <HomePage />,
        handle: { title: "Home" },
      },
      {
        path: "/admin/users",
        element: <UsersPage />,
        handle: { title: "Users" },
      },
    ],
  },
  // Puedes añadir más rutas aquí
  {
    path: "*",
    element: <NotFoundPage />,
  },
];
