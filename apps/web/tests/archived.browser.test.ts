import { expect, test } from "@playwright/test";

test("signed-in users can reach Archived and see the create-first-note hint", async ({ page }) => {
  const email = `archived-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.getByRole("button", { name: "Archived" }).click();
  await expect(page.getByRole("heading", { name: "Archived" })).toBeVisible();
  await expect(
    page.getByText("Create your first note to see it here when archived."),
  ).toBeVisible();
});
