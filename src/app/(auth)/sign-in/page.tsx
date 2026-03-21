"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, ArrowRight, Loader2 } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleOAuth = (provider: string) => {
    setIsLoading(provider);
    void signIn(provider, { callbackUrl: "/dashboard" });
  };

  const handleEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading("email");
    void signIn("resend", { email, callbackUrl: "/dashboard" }).then(() => {
      setEmailSent(true);
      setIsLoading(null);
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-[400px] px-6">
        {/* Logo & heading */}
        <div className="mb-10 text-center">
          <h1
            className="mb-2 text-[28px] font-semibold tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Welcome to Flowmind
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)]">
            Sign in to your cognitive workspace
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={isLoading !== null}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] text-[15px] font-medium text-[var(--text-primary)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--bg-hover)] hover:shadow-[var(--shadow-resting)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] disabled:opacity-50"
          >
            {isLoading === "google" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuth("github")}
            disabled={isLoading !== null}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] text-[15px] font-medium text-[var(--text-primary)] transition-all duration-[var(--duration-fast)] hover:bg-[var(--bg-hover)] hover:shadow-[var(--shadow-resting)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] disabled:opacity-50"
          >
            {isLoading === "github" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GitHubIcon />
            )}
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-[var(--border-default)]" />
          <span className="text-[13px] text-[var(--text-tertiary)]">or</span>
          <div className="h-px flex-1 bg-[var(--border-default)]" />
        </div>

        {/* Email magic link */}
        {emailSent ? (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-center">
            <Mail className="mx-auto mb-3 h-10 w-10 text-[var(--accent-primary)]" />
            <p className="text-[15px] font-medium text-[var(--text-primary)]">
              Check your email
            </p>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              We sent a magic link to{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {email}
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
              className="mt-4 text-[13px] text-[var(--accent-primary)] hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] pl-11 pr-4 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-[var(--duration-fast)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading !== null || !email.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] text-[15px] font-medium text-white transition-all duration-[var(--duration-fast)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] disabled:opacity-50"
            >
              {isLoading === "email" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue with Email
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-[12px] leading-relaxed text-[var(--text-tertiary)]">
          By continuing, you agree to Flowmind&apos;s Terms of Service and
          Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
