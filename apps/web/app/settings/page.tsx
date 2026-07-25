import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <div className="mx-auto flex w-full max-w-[--layout-content-max] flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="text-h3 text-fg">Profile</h2>
          <p className="text-body-sm text-fg-muted">
            Shown on shared documents and in workspace member lists.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Display name" defaultValue="Brix Romero" name="name" />
            <Field
              label="Email"
              type="email"
              name="email"
              defaultValue="brix@example.com"
              autoComplete="email"
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-h3 text-fg">Theme</h2>
          <p className="text-body-sm text-fg-muted">
            System, light or dark. Persisted to your account, not just this
            browser.
          </p>
          <div className="flex flex-wrap gap-2">
            {["System", "Light", "Dark"].map((m) => (
              <Button key={m} variant={m === "System" ? "primary" : "secondary"}>
                {m}
              </Button>
            ))}
          </div>
        </Card>

        {/* Destructive actions are spatially separated from everything else */}
        <section
          aria-labelledby="danger"
          className="flex flex-col gap-3 rounded-lg border border-danger bg-tint-danger p-6"
        >
          <h2 id="danger" className="text-h3 text-on-tint-danger">
            Danger zone
          </h2>
          <p className="text-body-sm text-fg">
            Deleting your account removes every document, chunk and conversation.
            Export first — this cannot be undone.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary">Export everything first</Button>
            <Button variant="destructive">Delete account</Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
