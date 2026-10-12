import { expect, type Page, test } from "@playwright/test";

async function signUp(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill(`note-browser-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Quick note" })).toBeVisible();
}

test("shows normalized tags after saving a quick note", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("Title").fill("Tagged quick note");
  await page.getByLabel("Tags").fill("Work, work, Personal");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved");
  const note = page.getByRole("listitem").filter({ hasText: "Tagged quick note" });
  await expect(note).toContainText("Tags: work, personal");
});

test("signed-in user saves a literal quick note in the main list", async ({ page }) => {
  await signUp(page);
  const started = Date.now();
  await page.getByLabel("Title").fill("Literal <title>");
  await page.getByLabel("Body").fill("<b>literal</b>\nplain text");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved");
  await expect(page.getByRole("heading", { name: "Literal <title>" })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(10_000);
});
