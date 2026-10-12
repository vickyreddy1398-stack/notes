import { devices, expect, test } from "@playwright/test";

test.use({ ...devices["Pixel 5"] });

test("mobile quick entry keeps the form usable and displays the saved note", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill(`mobile-note-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Quick note" })).toBeVisible();
  await expect(page.getByLabel("Title")).toBeVisible();
  await page.getByLabel("Title").fill("Mobile note");
  await page.getByLabel("Body").fill("one line");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved");
  await expect(page.getByRole("heading", { name: "Mobile note" })).toBeVisible();
});
