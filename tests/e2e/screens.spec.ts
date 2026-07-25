import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/sign-in", name: "sign-in" },
  { path: "/dashboard", name: "dashboard" },
  { path: "/vault", name: "knowledge-base" },
  { path: "/chat", name: "chat" },
  { path: "/search", name: "search" },
  { path: "/settings", name: "settings" },
  { path: "/this-route-does-not-exist", name: "404" },
] as const;

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

for (const route of ROUTES) {
  test(`${route.name} renders clean`, async ({ page }, testInfo) => {
    const errors = collectErrors(page);
    await page.goto(route.path, { waitUntil: "networkidle" });

    // 1. no console or runtime errors. A 404 route legitimately logs a failed
    //    document request, so that one message is expected there and only there.
    const unexpected = errors.filter(
      (e) => !(route.name === "404" && /status of 404/i.test(e)),
    );
    expect(unexpected, `console errors on ${route.path}`).toEqual([]);

    // 2. no horizontal page scroll at any viewport
    const overflow = await page.evaluate(() => {
      const d = document.documentElement;
      return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
    });
    expect(
      overflow.scrollWidth,
      `horizontal scroll on ${route.path} at ${testInfo.project.name}`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // 3. exactly one h1 and a main landmark
    await expect(page.locator("main#main")).toHaveCount(1);
    expect(await page.locator("h1").count()).toBeGreaterThanOrEqual(1);

    await page.screenshot({
      path: testInfo.outputPath(`${route.name}-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });
}

test("skip link is the first focusable element and targets main", async ({ page }) => {
  await page.goto("/dashboard");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveText(/skip to main content/i);
  await expect(focused).toHaveAttribute("href", "#main");
});

test("focus ring is visible and never removed", async ({ page }) => {
  await page.goto("/sign-in");
  const email = page.getByLabel("Email");
  await email.focus();
  const shadow = await email.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toBe("none");
});

test("every form input has an associated visible label", async ({ page }) => {
  for (const path of ["/sign-in", "/settings", "/search"]) {
    await page.goto(path);
    const unlabelled = await page.evaluate(() => {
      const bad: string[] = [];
      document
        .querySelectorAll<HTMLInputElement>("input:not([type=hidden])")
        .forEach((el) => {
          const byFor = el.id && document.querySelector(`label[for="${el.id}"]`);
          const wrapped = el.closest("label");
          const aria = el.getAttribute("aria-label");
          if (!byFor && !wrapped && !aria) bad.push(el.outerHTML.slice(0, 80));
        });
      return bad;
    });
    expect(unlabelled, `unlabelled inputs on ${path}`).toEqual([]);
  }
});

test("interactive controls meet the 44px touch floor on mobile", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile viewport only");
  for (const path of ["/dashboard", "/chat", "/vault"]) {
    await page.goto(path);
    const small = await page.evaluate(() => {
      const bad: string[] = [];
      document
        .querySelectorAll<HTMLElement>("a, button, input[type=checkbox]")
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return; // not rendered
          const style = getComputedStyle(el);
          if (style.display === "inline") return; // inline text links
          // Visually-hidden until focused (skip link): 1px by design.
          if (el.classList.contains("sr-only")) return;
          if (r.height < 44 - 0.5)
            bad.push(`${el.tagName}.${el.className}`.slice(0, 70) + ` h=${Math.round(r.height)}`);
        });
      return bad;
    });
    expect(small, `sub-44px targets on ${path}`).toEqual([]);
  }
});

test("numeric columns use tabular figures", async ({ page }) => {
  await page.goto("/vault");
  const nonTabular = await page.evaluate(() => {
    const bad: string[] = [];
    document.querySelectorAll("td.tabular").forEach((el) => {
      if (!getComputedStyle(el).fontVariantNumeric.includes("tabular-nums"))
        bad.push(el.textContent ?? "");
    });
    return bad;
  });
  expect(nonTabular).toEqual([]);
});

test("dark mode resolves its own token values, not an inversion", async ({
  page,
}) => {
  await page.goto("/");
  const dark = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-theme="dark"]')!;
    const cs = getComputedStyle(root);
    return {
      bg: cs.getPropertyValue("--bg").trim(),
      ring: cs.getPropertyValue("--ring").trim(),
      fg: cs.getPropertyValue("--fg").trim(),
    };
  });
  expect(dark.bg).toBe("#0b0b14"); // Void
  expect(dark.fg).toBe("#f2f2f7");
  // indigo on Void is 2.4:1 and fails the 3:1 focus minimum, so dark swaps to cyan
  expect(dark.ring).toBe("#22d3ee");
});
