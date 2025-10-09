import { useAuthContext } from "@/providers/AuthProvider";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Background from "@/components/background";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const { accessToken, register, loading, error } = useAuthContext();
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

  function handleSubmit(): void {
    const username = (document.getElementById("username") as HTMLInputElement)
      .value;
    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement)
      .value;
    const passwordRepeat = (
      document.getElementById("password_repeat") as HTMLInputElement
    ).value;
    const name = (document.getElementById("name") as HTMLInputElement).value;
    const surname = (document.getElementById("surname") as HTMLInputElement)
      .value;
    const birthday = (document.getElementById("birthday") as HTMLInputElement)
      .value;
    if (password !== passwordRepeat) {
      alert("Passwords do not match");
      return;
    }
    register(username, email, password, name, surname, birthday);
  }

  return (
    <Background>
      <div className="flex h-screen w-screen items-center justify-center my-16 md:my-0">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 lg:justify-start">
          <a href={logo.url}>
            <img
              src={logo.src}
              alt={logo.alt}
              title={logo.title}
              className="h-10 dark:invert"
            />
          </a>
          <div className="border-muted bg-background flex w-full max-w-sm md:max-w-3xl flex-col items-center gap-y-4 rounded-md border px-1 py-6 md:px-6 md:py-8 shadow-md transition-all">
            <h1 className="text-xl font-semibold md:text-3xl">Create your account</h1>
            <div className="w-3xl max-w-sm md:max-w-3xl px-2 md:px-6">
              <FieldSet>
                <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-7">
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input id="name" type="text" placeholder="Scott" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="surname">Surname</FieldLabel>
                    <Input id="surname" type="text" placeholder="Tiger" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Scott Tiger"
                    />
                    <FieldDescription>
                      Choose a unique username for your account.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Scott.Tiger@example.com"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="birthday">Birthday</FieldLabel>
                    <Input id="birthday" type="date" placeholder="01/01/1970" />
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <FieldDescription>
                      Must be at least 8 characters long.
                    </FieldDescription>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                    />
                    <FieldDescription>Repeat your password</FieldDescription>
                    <Input
                      id="password_repeat"
                      type="password"
                      placeholder="********"
                    />
                  </Field>
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    By clicking "Register", you agree to our Terms of Service
                    and Privacy Policy.
                  </p>
                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full md:col-span-2"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner />
                        Loading...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                  {error && (
                    <div className="text-sm text-red-600 md:col-span-2">
                      {error}
                    </div>
                  )}
                </FieldGroup>
              </FieldSet>
            </div>
          </div>
          <div className="text-muted-foreground flex justify-center gap-1 text-sm">
            <p>You have an account?</p>
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </Background>
  );
}
