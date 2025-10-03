import { AuthProvider } from "@/components/AuthProvider";
import { useRoutes } from "react-router-dom";
import { appRoutes } from "@/routes";

function App() {
  const routes = useRoutes(appRoutes);
  return <AuthProvider>{routes}</AuthProvider>;
}

export default App;
