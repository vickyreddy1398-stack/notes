import { expect, test } from "@playwright/test";

test("signed-out sign-in screen matches the approved auth design", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator("main.auth-card")).toBeVisible();
  await expect(page.locator(".auth-card__header .topbar__mark")).toHaveText("N");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Sign in to your private notes.")).toBeVisible();
  await expect(page.locator("label.field")).toHaveCount(2);
  await expect(page.locator('input[name="email"].field__control')).toHaveAttribute(
    "autocomplete",
    "email",
  );
  await expect(page.locator('input[name="password"].field__control')).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(page.locator("button.button.w-full")).toHaveText("Sign in");
  await expect(page.locator(".auth-card__footer a")).toHaveAttribute("href", "/");

  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator("main.auth-card")).toBeVisible();
});

test("shows sign-in validation feedback in the designed error style", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("wrong password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("p.field__error[role=alert]")).toContainText(
    "Invalid email or password",
  );
});

test("signs in and arrives at the private Notes workspace", async ({ page, context }) => {
  const email = `signin-browser-${Date.now()}@example.com`;
  const password = "a password";
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await context.clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  const session = (await context.cookies()).find((cookie) => cookie.name === "session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  expect(session?.path).toBe("/");
  expect(session?.expires).toBeGreaterThan(Date.now() / 1000 + 6 * 24 * 60 * 60);
});
