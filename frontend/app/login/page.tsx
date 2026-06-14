"use client";

import { useState, useCallback } from "react";
import { Shield, User, Lock, AlertCircle, ChevronRight, Link } from "lucide-react";
import { BattlementsStrip, InputField } from "../register/page";
import { useRouter } from "next/navigation";

interface FormFields {
  username: string;
  password: string;
}

interface FormErrors {
  username?: string;
  password?: string;
  server?: string;
}

type FormStatus = "idle" | "loading" | "success";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function validateFields(fields: FormFields): FormErrors {
  const errors: FormErrors = {};
  if (!fields.username.trim()) {
    errors.username = "Username is required.";
  }
  if (!fields.password) {
    errors.password = "Password is required.";
  }
  return errors;
}

async function loginUser(fields: FormFields): Promise<void> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });

  if (!res.ok) {
    // Try to parse a JSON error body; fall back to status text
    let message = `Login failed (${res.status}).`;
    try {
      const body = await res.json();
      if (body?.error || body?.message) {
        message = body.error ?? body.message;
      }

    } catch {
      // ignore parse error
    }
    throw new Error(message);
  } else {
    const body = await res.json();
    localStorage.setItem("JWTtoken", body.token)
  }
}
// 201 Created — no body expected

/** Decorative battlements strip at the top of the card */
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const router = useRouter()
  const [fields, setFields] = useState<FormFields>({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>("idle");

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFields((prev) => ({ ...prev, [id]: value }));
    // Clear the field-level error as the user edits
    setErrors((prev) => ({ ...prev, [id]: undefined, server: undefined }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (status === "loading") return;

      const validationErrors = validateFields(fields);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setErrors({});
      setStatus("loading");

      try {
        await loginUser(fields);
        setStatus("success");
        router.replace('/village')
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Try again.";
        setErrors({ server: message });
        setStatus("idle");
      }
    },
    [fields, status],
  );

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  return (
    <main className="min-h-screen bg-abyss flex items-center justify-center px-4 py-12">
      {/* Atmospheric radial glow behind card */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(232,103,58,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* ── Brand mark ── */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-fortress border border-wall shadow-lg">
            <Shield size={22} className="text-ember" strokeWidth={1.8} />
          </div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-parchment">
            Blast<span className="text-ember">of</span>Bastion
          </h1>
          <p className="text-xs text-muted tracking-wider">
            CONFIRM YOUR IDENTITY
          </p>
        </div>

        {/* ── Card ── */}
        <div className="rounded-lg overflow-hidden shadow-2xl border border-wall bg-fortress">
          {/* Battlements top accent */}
          {/* <BattlementsStrip /> */}

          <div className="px-6 pt-6 pb-8">
            {isSuccess ? (
              <div></div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-parchment mb-1">
                  Login Account
                </h2>
                <p className="text-xs text-muted mb-6">
                   
                </p>

                {/* Server-level error */}
                {errors.server && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md bg-red-900/30 border border-red-700/50 px-3 py-2.5 mb-5 text-sm text-red-300"
                  >
                    <AlertCircle size={15} className="shrink-0 mt-px" />
                    <span>{errors.server}</span>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="flex flex-col gap-4"
                >
                  <InputField
                    id="username"
                    label="Username"
                    type="text"
                    value={fields.username}
                    placeholder="Username"
                    error={errors.username}
                    disabled={isLoading}
                    icon={<User size={15} />}
                    onChange={handleChange}
                  />
                  <InputField
                    id="password"
                    label="Password"
                    type="password"
                    value={fields.password}
                    placeholder="Password"
                    error={errors.password}
                    disabled={isLoading}
                    icon={<Lock size={15} />}
                    onChange={handleChange}
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={[
                      "mt-2 w-full flex items-center justify-center gap-2",
                      "rounded-md py-2.5 px-4 text-sm font-semibold tracking-wide",
                      "bg-ember text-gray border border-transparent",
                      "transition-all duration-150",
                      "hover:bg-ember-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-fortress",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      "cursor-pointer",
                      "bg-amber-100 dark:bg-amber-950",
                    ].join(" ")}
                  >
                    {isLoading ? (
                      <>
                        <SpinnerIcon />
                        Logging into Account…
                      </>
                    ) : (
                      <>
                        Login
                        <ChevronRight size={15} />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs text-muted">
                  Create an account, {" "}
                  <a
                    href="/register"
                    className="text-ember hover:text-ember-dark underline underline-offset-2 transition-colors"
                  >
                    Sign up
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

// function SuccessBanner({ username }: { username: string }) {
//   return (
//   );
// }

// ---------------------------------------------------------------------------
// Inline spinner (no external dep)
// ---------------------------------------------------------------------------
function SpinnerIcon() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
