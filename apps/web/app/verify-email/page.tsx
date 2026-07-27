"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Glyph, Wordmark } from "@/components/brand/glyph";
import { ErrorNote, Spinner } from "@/components/ui/states";
import { api } from "@/lib/api";

type Status = "checking" | "verified" | "error";

function VerifyEmailBody() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("This link is missing its token.");
      return;
    }
    api
      .verifyEmail(token)
      .then(() => setStatus("verified"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "That link is invalid or has expired.");
      });
  }, [token]);

  if (status === "checking") return <Spinner label="Verifying your email…" />;

  if (status === "verified") {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-body text-fg">
          Your email is verified.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-5 text-body text-fg-on-primary transition-colors duration-[--duration-fast] hover:bg-primary-hover"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return <ErrorNote message={error ?? "Verification failed."} />;
}

export default function VerifyEmailPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="flex w-full max-w-[400px] flex-col gap-5">
        <Link href="/" className="flex items-center gap-2">
          <Glyph size={32} />
          <Wordmark className="text-[1.25rem]" />
        </Link>

        <h1 className="text-h1 text-fg">Email verification</h1>

        <Suspense fallback={<Spinner label="Loading…" />}>
          <VerifyEmailBody />
        </Suspense>
      </div>
    </div>
  );
}
