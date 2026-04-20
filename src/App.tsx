import { AuthProvider } from "@/providers/AuthProvider";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";
import { ThemeProvider } from "./providers/ThemeProvider";
import { SidebarProvider } from "./components/ui/sidebar";
import ErrorBoundary from "./components/common/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <AuthProvider>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <RouterProvider router={router} />
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
