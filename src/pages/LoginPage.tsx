import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/components/AuthProvider";

import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { login, loading, error, accessToken } = useAuthContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Logo definition
  const logo = {
    url: "/",
    src: "/logo.svg",
    alt: "Prometeo Logo",
    title: "Prometeo",
  };

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true });
    }
  }, [accessToken, navigate]);

  const handleSubmit = () => {
    login(username, password);
  };

  return (
    <section className="bg-muted h-screen">
      <div className="flex h-full items-center justify-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-6 lg:justify-start">
          <a href={logo.url}>
            <img
              src={logo.src}
              alt={logo.alt}
              title={logo.title}
              className="h-10 dark:invert"
            />
          </a>
          <div className="min-w-sm border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-4 rounded-md border px-6 py-8 shadow-md">
            <h1 className="text-xl font-semibold">Welcome Back</h1>
            <Input
              type="email"
              placeholder="Email"
              className="text-sm"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <Input
              type="password"
              placeholder="Password"
              className="text-sm"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
            <Button
              type="submit"
              className="w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Loading..." : "Login"}
            </Button>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
          <div className="text-muted-foreground flex justify-center gap-1 text-sm">
            <p>Don't have an account?</p>
            <a href={"#"} className="text-primary font-medium hover:underline">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
