"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { ErrorNote } from "@/components/ui/states";
import { api } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth";

export default function SettingsPage() {
  const user = useRequireAuth();
  const { signOut } = useAuth();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setName(user.name ?? "");
  }, [user]);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateMe({ name });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell title="Settings">
      <div className="mx-auto flex w-full max-w-[--layout-content-max] flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="text-h3 text-fg">Profile</h2>
          <form onSubmit={onSave} className="flex flex-col gap-4">
            <Field label="Email" value={user.email} readOnly />
            <Field
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should we greet you?"
            />
            {error && <ErrorNote message={error} />}
            {saved && (
              <p role="status" className="text-body-sm text-success-fg">
                Saved.
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="md" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 text-fg">Session</h2>
          <p className="measure text-body-sm text-fg-muted">
            Signing out clears this device only. Access tokens stay valid until
            they expire, because the API issues stateless tokens with no
            revocation list.
          </p>
          <div className="flex justify-start">
            <Button variant="secondary" size="md" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
