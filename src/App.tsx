import { AuthProvider } from "@/providers/AuthProvider";
import { useRoutes } from "react-router-dom";
import { appRoutes } from "@/routes";
import { ThemeProvider } from "./providers/ThemeProvider";

function App() {
  const routes = useRoutes(appRoutes);
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>{routes}</AuthProvider>
    </ThemeProvider>
  );
}

export default App;
