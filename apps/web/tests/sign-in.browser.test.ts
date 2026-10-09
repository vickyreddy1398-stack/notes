import { expect, test } from "@playwright/test";

test("signs in and arrives at the private Notes workspace", async ({ page, context }) => {
  const email = `signin-browser-${Date.now()}@example.com`;
  const password = "a password";
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
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
