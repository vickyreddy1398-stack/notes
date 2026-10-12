import { expect, test } from "@playwright/test";

test("signed-out sign-up screen matches the approved auth design", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main.auth-card")).toBeVisible();
  await expect(page.locator(".auth-card__header .topbar__mark")).toHaveText("N");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByText("Start capturing private notes in seconds.")).toBeVisible();
  await expect(page.locator("label.field")).toHaveCount(2);
  await expect(page.locator('input[name="email"].field__control')).toHaveAttribute(
    "autocomplete",
    "email",
  );
  await expect(page.locator('input[name="password"].field__control')).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
  await expect(page.locator(".field__hint")).toHaveText(
    "Your account keeps your notes private to you.",
  );
  await expect(page.locator("button.button.w-full")).toHaveText("Create account");
  await expect(page.locator(".auth-card__footer a")).toHaveAttribute("href", "/sign-in");

  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator("main.auth-card")).toBeVisible();
});

test("creates an account and remains authenticated after reload", async ({ page, context }) => {
  const email = `browser-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === "session");
  expect(session).toBeDefined();
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect(session?.path).toBe("/");
  expect(session?.expires).toBeGreaterThan(Date.now() / 1000 + 6 * 24 * 60 * 60);

  await page.reload();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
});
