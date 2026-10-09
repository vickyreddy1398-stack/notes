import { expect, test } from "@playwright/test";

test("creates an account and remains authenticated after reload", async ({ page, context }) => {
  const email = `browser-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Sign up" }).click();
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
