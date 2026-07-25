import Link from "next/link";
import { Glyph, Wordmark } from "@/components/brand/glyph";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";

export default function SignInPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main id="main" className="flex items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-[400px] flex-col gap-5">
          <Link href="/" className="flex items-center gap-2">
            <Glyph size={32} />
            <Wordmark className="text-[1.25rem]" />
          </Link>

          <h1 className="text-h1 text-fg">Welcome back</h1>
          <p className="text-body text-fg-muted">Sign in to your vault.</p>

          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="lg" className="w-full">
              Continue with Google
            </Button>
            <Button variant="secondary" size="lg" className="w-full">
              Continue with GitHub
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-caption text-fg-subtle">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="flex flex-col gap-4">
            <Field
              label="Email"
              type="email"
              name="email"
              size="lg"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              type="password"
              name="password"
              size="lg"
              autoComplete="current-password"
              helper="At least 12 characters. Longer beats complex."
            />
            <Button type="submit" size="lg" className="w-full">
              Sign in
            </Button>
          </form>

          <p className="text-center text-body-sm text-fg-subtle">
            New here?{" "}
            <Link href="/sign-up" className="text-primary-fg underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>
      </main>

      <aside className="hidden flex-col justify-center gap-6 bg-surface-brand px-16 lg:flex">
        <span aria-hidden className="h-1 w-[120px] rounded-sm gradient-brand" />
        <p className="text-display-2 text-fg">
          Every answer cites the exact source chunk it came from.
        </p>
        <p className="measure text-body-lg text-fg-muted">
          CortexVault answers only from your own corpus. If it is not in your
          vault, it does not get said.
        </p>
      </aside>
    </div>
  );
}
