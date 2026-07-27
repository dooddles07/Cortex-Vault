"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { useAuth } from "@/lib/auth";

export default function SignUpPage() {
  const { signUp, user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp(email, password, name);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      aside={{
        headline: "Capture everything. Ask it anything.",
        body: "Notes, PDFs and bookmarks become one searchable memory — with a citation behind every claim.",
        proof: "200 MB free · full export · bring your own LLM key",
      }}
    >
      <h1 className="text-h1 text-fg">Create your vault</h1>
      <p className="text-body text-fg-muted">Everything you capture stays yours.</p>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <Field
          label="Name"
          name="name"
          size="lg"
          autoComplete="name"
          placeholder="Optional"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          helper="At least 8 characters. Longer beats complex."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <ErrorNote message={error} />}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>

      <p className="text-center text-body-sm text-fg-subtle">
        Already have a vault?{" "}
        <Link href="/sign-in" className="text-primary-fg underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
