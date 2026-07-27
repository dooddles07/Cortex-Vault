import { expect, test, type Page } from "@playwright/test";

/**
 * screens.spec.ts walks the routes unauthenticated, so /dashboard, /vault,
 * /chat, /search and /settings all redirect to /sign-in and its assertions
 * never reach the app shell. This file stubs the API so the authenticated
 * screens are exercised for real, and covers the interactive surfaces:
 * command palette, theme persistence, dropzone, dialog and reduced motion.
 */

const USER = {
  id: "u1",
  email: "test@example.com",
  name: "Test User",
  email_verified: true,
  theme_preference: "dark",
  mfa_enabled: false,
  created_at: "2026-01-01T00:00:00Z",
};

const DOCS = [
  {
    id: "d1",
    type: "note",
    title: "Board update Q3",
    content: "Revenue is up, churn is flat.",
    summary: null,
    source_url: null,
    folder_id: null,
    ingest_status: "indexed",
    starred: false,
    created_at: "2026-07-22T10:00:00Z",
    updated_at: "2026-07-25T10:00:00Z",
  },
];

const HITS = [
  {
    chunk_id: "c1",
    document_id: "d1",
    document_title: "Board update Q3",
    content: "Revenue is up and churn is flat across every cohort we measured.",
    score: 0.8213,
  },
];

async function signedIn(page: Page) {
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (url.includes("/me")) return json(USER);
    if (url.includes("/dashboard/summary"))
      return json({ documents: 1, chunks: 4, conversations: 0, recent: [] });
    if (url.includes("/documents"))
      return json({ items: DOCS, total: 1, limit: 50, offset: 0 });
    if (url.includes("/search"))
      return json({ query: "revenue", mode: "hybrid", hits: HITS });
    return json({});
  });
  await page.addInitScript(() => {
    localStorage.setItem("cortexvault.token", "test-token");
  });
}

const APP_ROUTES = ["/dashboard", "/vault", "/chat", "/search", "/settings"];

for (const path of APP_ROUTES) {
  test(`${path} renders the app shell, not a redirect`, async ({ page }) => {
    await signedIn(page);
    await page.goto(path, { waitUntil: "networkidle" });

    // Proves we are past the auth gate rather than looking at /sign-in.
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
    await expect(page.locator("main#main")).toHaveCount(1);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
}

test("command palette opens on Ctrl K, focuses its input and closes on Escape", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "keyboard shortcut is a pointer-device path");
  await signedIn(page);
  await page.goto("/dashboard", { waitUntil: "networkidle" });

  await page.keyboard.press("Control+k");
  const input = page.getByLabel("Search your vault or jump to a screen");
  await expect(input).toBeFocused();

  // The dialog element traps focus, so Tab cannot escape to the page behind it.
  await page.keyboard.press("Tab");
  const inDialog = await page.evaluate(
    () => document.activeElement?.closest("dialog") !== null,
  );
  expect(inDialog).toBe(true);

  await page.keyboard.press("Escape");
  await expect(input).toHaveCount(0);
});

test("theme choice survives a reload and never flashes the wrong palette", async ({
  page,
}) => {
  await signedIn(page);
  await page.goto("/settings", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // The blocking script must set the attribute before the body paints, so the
  // resolved background is already light on first paint.
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  );
  expect(bg).toBe("#f8f8fc"); // Paper, the light-mode page background
});

test("the dropzone is reachable and operable from the keyboard", async ({ page }) => {
  await signedIn(page);
  await page.goto("/vault", { waitUntil: "networkidle" });

  // Drag is an accelerator; the picker button is the real control.
  const picker = page.getByRole("button", { name: "Choose files" });
  await expect(picker).toBeVisible();
  await picker.focus();
  await expect(picker).toBeFocused();

  const shadow = await picker.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toBe("none");
});

test("trashing a document asks first", async ({ page }) => {
  await signedIn(page);
  await page.goto("/vault", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: /Move Board update Q3 to Trash/ }).click();
  await expect(page.getByRole("heading", { name: "Move to Trash?" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Move to Trash?" })).toHaveCount(0);
});

test.describe("reduced motion", () => {
  test("collapses transitions instead of animating", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signedIn(page);
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const { matched, durations } = await page.evaluate(() => {
      const out: number[] = [];
      document.querySelectorAll<HTMLElement>("a, button").forEach((el) => {
        const d = getComputedStyle(el).transitionDuration;
        d.split(",").forEach((part) => out.push(parseFloat(part) * 1000));
      });
      return {
        matched: matchMedia("(prefers-reduced-motion: reduce)").matches,
        durations: out,
      };
    });
    expect(matched, "reduced-motion emulation is active").toBe(true);
    // The global reduced-motion block clamps every transition to 100ms.
    expect(Math.max(0, ...durations)).toBeLessThanOrEqual(100);

    const cursor = await page.evaluate(() => {
      const el = document.querySelector(".streaming-cursor");
      return el ? getComputedStyle(el).animationName : "none";
    });
    expect(cursor).toBe("none");
  });
});
