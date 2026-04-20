import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuthContext } from "@/providers/AuthProvider";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Background from "@/components/common/background";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BorderBeam } from "@/components/ui/border-beam";
import { UserPlus } from "lucide-react";

type RegisterFormValues = {
  name: string;
  surname: string;
  username: string;
  email: string;
  birthday: string;
  password: string;
  passwordRepeat: string;
};

type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;

const INITIAL_FORM_VALUES: RegisterFormValues = {
  name: "",
  surname: "",
  username: "",
  email: "",
  birthday: "",
  password: "",
  passwordRepeat: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getTodayDateValue() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getRegisterErrors(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!values.username.trim()) {
    errors.username = "Enter a username.";
  } else if (values.username.trim().length < 3) {
    errors.username = "Username must be at least 3 characters long.";
  } else if (values.username.trim().length > 30) {
    errors.username = "Username cannot exceed 30 characters.";
  }

  if (!values.email.trim()) {
    errors.email = "Enter your email.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (values.name.trim().length > 50) {
    errors.name = "Name cannot exceed 50 characters.";
  }

  if (values.surname.trim().length > 50) {
    errors.surname = "Surname cannot exceed 50 characters.";
  }

  if (values.birthday) {
    const today = getTodayDateValue();
    if (values.birthday > today) {
      errors.birthday = "Birthday cannot be in the future.";
    }
  }

  if (!values.password) {
    errors.password = "Enter a password.";
  } else if (values.password.length < 12) {
    errors.password = "Password must be at least 12 characters long.";
  }

  if (!values.passwordRepeat) {
    errors.passwordRepeat = "Repeat your password.";
  } else if (values.password !== values.passwordRepeat) {
    errors.passwordRepeat = "Passwords do not match.";
  }

  return errors;
}

export default function RegisterPage() {
  const { accessToken, register, loading, error, clearError } =
    useAuthContext();
  const [formValues, setFormValues] =
    useState<RegisterFormValues>(INITIAL_FORM_VALUES);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [touched, setTouched] = useState<
    Partial<Record<keyof RegisterFormValues, boolean>>
  >({});
  const navigate = useNavigate();
  const maxBirthday = getTodayDateValue();

  const validationErrors = getRegisterErrors(formValues);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true });
    }
  }, [accessToken, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setAttemptedSubmit(true);

    const nextErrors = getRegisterErrors(formValues);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await register(
      formValues.username.trim(),
      formValues.email.trim().toLowerCase(),
      formValues.password,
      formValues.name.trim(),
      formValues.surname.trim(),
      formValues.birthday,
    );
  };

  const updateField = (field: keyof RegisterFormValues, value: string) => {
    if (error) {
      clearError();
    }

    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const logo = {
    url: "/",
    src: "/logo.svg",
    alt: "Prometeo Logo",
    title: "Prometeo",
  };

  return (
    <Background>
      <main className="flex min-h-screen w-screen items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-4xl flex-col items-center gap-5">
          <a href={logo.url} className="rounded-md p-2">
            <img
              src={logo.src}
              alt={logo.alt}
              title={logo.title}
              className="h-10 dark:invert"
            />
          </a>

          <section className="relative grid w-full overflow-hidden rounded-md border border-white/10 bg-background/95 shadow-2xl backdrop-blur md:grid-cols-[0.85fr_1.15fr]">
            <div className="hidden border-r bg-muted/40 p-8 md:flex md:flex-col md:justify-between">
              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-md border bg-background">
                  <UserPlus className="size-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold">
                    Create your account
                  </h1>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Set up your profile and access your Prometeo dashboard.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Already registered? Sign in with your existing account.
              </p>
            </div>

            <div className="w-full px-5 py-6 md:px-7 md:py-8">
              <div className="mb-6 space-y-2 md:hidden">
                <div className="flex size-11 items-center justify-center rounded-md border bg-muted">
                  <UserPlus className="size-5 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold">
                  Create your account
                </h1>
                <p className="text-sm text-muted-foreground">
                  Set up your profile and access your Prometeo dashboard.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <FieldSet>
                  <FieldGroup className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="register-name">Name</FieldLabel>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Scott"
                        autoComplete="given-name"
                        value={formValues.name}
                        aria-invalid={Boolean(
                          (attemptedSubmit || touched.name) &&
                          validationErrors.name,
                        )}
                        onBlur={() =>
                          setTouched((current) => ({ ...current, name: true }))
                        }
                        onChange={(e) => updateField("name", e.target.value)}
                      />
                      {(attemptedSubmit || touched.name) && (
                        <FieldError>{validationErrors.name}</FieldError>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="register-surname">
                        Surname
                      </FieldLabel>
                      <Input
                        id="register-surname"
                        type="text"
                        placeholder="Tiger"
                        autoComplete="family-name"
                        value={formValues.surname}
                        aria-invalid={Boolean(
                          (attemptedSubmit || touched.surname) &&
                          validationErrors.surname,
                        )}
                        onBlur={() =>
                          setTouched((current) => ({
                            ...current,
                            surname: true,
                          }))
                        }
                        onChange={(e) => updateField("surname", e.target.value)}
                      />
                      {(attemptedSubmit || touched.surname) && (
                        <FieldError>{validationErrors.surname}</FieldError>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="register-username">
                        Username
                      </FieldLabel>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="scotttiger"
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        value={formValues.username}
                        aria-invalid={Boolean(
                          (attemptedSubmit || touched.username) &&
                          validationErrors.username,
                        )}
                        onBlur={() =>
                          setTouched((current) => ({
                            ...current,
                            username: true,
                          }))
                        }
                        onChange={(e) =>
                          updateField("username", e.target.value)
                        }
                      />
                      <FieldDescription>At least 3 characters.</FieldDescription>
                      {(attemptedSubmit || touched.username) && (
                        <FieldError>{validationErrors.username}</FieldError>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="register-email">Email</FieldLabel>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Scott.Tiger@example.com"
                        autoComplete="email"
                        inputMode="email"
                        value={formValues.email}
                        aria-invalid={Boolean(
                          (attemptedSubmit || touched.email) &&
                          validationErrors.email,
                        )}
                        onBlur={() =>
                          setTouched((current) => ({ ...current, email: true }))
                        }
                        onChange={(e) => updateField("email", e.target.value)}
                      />
                      {(attemptedSubmit || touched.email) && (
                        <FieldError>{validationErrors.email}</FieldError>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="register-birthday">
                        Birthday
                      </FieldLabel>
                      <Input
                        id="register-birthday"
                        type="date"
                        max={maxBirthday}
                        autoComplete="bday"
                        value={formValues.birthday}
                        aria-invalid={Boolean(
                          (attemptedSubmit || touched.birthday) &&
                          validationErrors.birthday,
                        )}
                        onBlur={() =>
                          setTouched((current) => ({
                            ...current,
                            birthday: true,
                          }))
                        }
                        onChange={(e) =>
                          updateField("birthday", e.target.value)
                        }
                      />
                      {(attemptedSubmit || touched.birthday) && (
                        <FieldError>{validationErrors.birthday}</FieldError>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="register-password">
                        Password
                      </FieldLabel>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="********"
                        autoComplete="new-password"
                        value={formValues.password}
                        aria-invalid={Boolean(
                          (attemptedSubmit || touched.password) &&
                          validationErrors.password,
                        )}
                        onBlur={() =>
                          setTouched((current) => ({
                            ...current,
                            password: true,
                          }))
                        }
                        onChange={(e) =>
                          updateField("password", e.target.value)
                        }
                      />
                      {(attemptedSubmit || touched.password) && (
                        <FieldError>{validationErrors.password}</FieldError>
                      )}
                      {!validationErrors.password && (
                        <FieldDescription>
                          12 characters minimum.
                        </FieldDescription>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="register-password-repeat">
                        Confirm password
                      </FieldLabel>
                      <Input
                        id="register-password-repeat"
                        type="password"
                        placeholder="********"
                        autoComplete="new-password"
                        value={formValues.passwordRepeat}
                        aria-invalid={Boolean(
                          (attemptedSubmit || touched.passwordRepeat) &&
                          validationErrors.passwordRepeat,
                        )}
                        onBlur={() =>
                          setTouched((current) => ({
                            ...current,
                            passwordRepeat: true,
                          }))
                        }
                        onChange={(e) =>
                          updateField("passwordRepeat", e.target.value)
                        }
                      />
                      {(attemptedSubmit || touched.passwordRepeat) && (
                        <FieldError>
                          {validationErrors.passwordRepeat}
                        </FieldError>
                      )}
                    </Field>

                    <p className="text-muted-foreground text-xs md:col-span-2">
                      By clicking "Create account", you agree to our Terms of Service
                      and Privacy Policy.
                    </p>

                    <Button
                      type="submit"
                      className="h-10 w-full md:col-span-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner />
                          Creating account...
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>

                    {error && (
                      <div
                        role="alert"
                        className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600 md:col-span-2"
                      >
                        {error}
                      </div>
                    )}
                  </FieldGroup>
                </FieldSet>
              </form>
            </div>
            <BorderBeam duration={8} size={100} />
          </section>
          <div className="text-muted-foreground flex justify-center gap-1 text-sm">
            <p>Already have an account?</p>
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </Background>
  );
}
