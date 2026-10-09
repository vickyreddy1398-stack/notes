import { expect, type Page, test } from "@playwright/test";

async function signUp(page: Page, prefix: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(`${prefix}-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Quick note" })).toBeVisible();
}

test("owner opens a note in the dedicated editor and another user cannot see it", async ({
  browser,
  page,
}) => {
  await signUp(page, "editor-owner");
  await page.getByLabel("Title").fill("Private editor title");
  await page.getByLabel("Body").fill("Private editor body");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("heading", { name: "Private editor title" })).toBeVisible();

  const noteLink = page.getByRole("link", { name: "Private editor title" });
  const noteUrl = await noteLink.getAttribute("href");
  expect(noteUrl).toMatch(/^\/notes\//);
  await noteLink.click();
  await expect(page.getByRole("heading", { name: "Edit note" })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Private editor title");
  await expect(page.getByLabel("Body")).toHaveValue("Private editor body");
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cancel" })).toBeVisible();
  await page.getByLabel("Title").fill("Saved editor title");
  await page.getByLabel("Body").fill("Saved editor body");
  await expect(page.getByRole("status")).not.toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.reload();
  await expect(page.getByLabel("Title")).toHaveValue("Saved editor title");
  await expect(page.getByLabel("Body")).toHaveValue("Saved editor body");

  const otherContext = await browser.newContext();
  try {
    const otherPage = await otherContext.newPage();
    await signUp(otherPage, "editor-other");
    await otherPage.goto(`http://127.0.0.1:5173${noteUrl}`);
    await expect(otherPage.getByRole("heading", { name: "Note unavailable" })).toBeVisible();
    await expect(otherPage.getByRole("alert")).toHaveText("note not found");
    await expect(otherPage.getByText("Private editor title")).not.toBeVisible();
    await expect(otherPage.getByText("Private editor body")).not.toBeVisible();
  } finally {
    await otherContext.close();
  }
});
