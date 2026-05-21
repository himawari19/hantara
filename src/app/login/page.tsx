"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signInWithEmail, signInWithGithub, signInWithGoogle } = useAuthStore();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error: authError } = await signInWithEmail(email, password);

    if (authError) {
      setError(authError);
      setIsLoading(false);
    } else {
      window.location.href = "/app";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold text-[var(--accent)]">
            Hantara
          </Link>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={signInWithGithub}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#24292e] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-opacity hover:opacity-90"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-secondary)]">or</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs text-[var(--text-secondary)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="rounded-lg bg-[var(--bg-tertiary)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs text-[var(--text-secondary)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-lg bg-[var(--bg-tertiary)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {error && (
              <p className="rounded bg-red-900/20 px-3 py-2 text-xs text-[var(--error)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-[var(--accent)] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Local Admin Hint */}
          <div className="mt-4 rounded border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2">
            <p className="text-[10px] text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--info)]">Demo account:</span>{" "}
              admin@hantara.lokal / admin123
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[var(--accent)] hover:underline">
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link href="/app" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            or continue without account →
          </Link>
        </p>
      </div>
    </div>
  );
}
