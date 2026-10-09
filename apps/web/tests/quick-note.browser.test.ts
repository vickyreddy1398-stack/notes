import { expect, test } from "@playwright/test";

test("signed-in user saves a literal quick note", async ({ page }) => {
  const email = `note-browser-${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.getByLabel("Title").fill("Literal <title>");
  await page.getByLabel("Body").fill("<b>literal</b>\nplain text");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved");
});
