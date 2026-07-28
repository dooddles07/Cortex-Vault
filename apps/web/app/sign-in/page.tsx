"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { useAuth } from "@/lib/auth";

export default function SignInPage() {
  const { signIn, completeMfaChallenge, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Set once sign-in reports the account has MFA enabled — switches the
  // form to the code-entry step instead of completing the session.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await signIn(email, password);
      if (result?.mfaRequired) {
        setMfaToken(result.mfaToken);
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onMfaSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setBusy(true);
    try {
      await completeMfaChallenge(mfaToken, mfaCode);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      aside={{
        headline: "Every answer cites the exact source it came from.",
        body: "CortexVault answers only from your own vault. If it is not in there, it does not get said.",
        proof: "keyword + semantic search · re-ranked · citations on every answer",
      }}
    >
      {mfaToken ? (
        <>
          <h1 className="text-h1 text-fg">Enter your code</h1>
          <p className="text-body text-fg-muted">
            Open your authenticator app, or use a backup code.
          </p>
          <form className="flex flex-col gap-4" onSubmit={onMfaSubmit}>
            <Field
              label="Code"
              name="code"
              size="lg"
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="123456"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
            />
            {error && <ErrorNote message={error} />}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Verify
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-h1 text-fg">Welcome back</h1>
          <p className="text-body text-fg-muted">Sign in to your vault.</p>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <Field
              label="Email"
              type="email"
              name="email"
              size="lg"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              name="password"
              size="lg"
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center self-end text-body-sm text-fg-subtle underline underline-offset-4 transition-colors duration-(--duration-fast) hover:text-fg"
            >
              Forgot password?
            </Link>
            {error && <ErrorNote message={error} />}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Sign in
            </Button>
          </form>

          <p className="text-center text-body-sm text-fg-subtle">
            New here?{" "}
            <Link
              href="/sign-up"
              className="text-primary-fg underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
