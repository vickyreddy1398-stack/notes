import { expect, type Page, test } from "@playwright/test";

async function signUp(page: Page, prefix: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(`${prefix}-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
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
  await expect(page.locator("main.note-editor")).toBeVisible();
  await expect(page.locator(".note-editor__header")).toBeVisible();
  await expect(page.locator(".note-editor__actions .button")).toHaveCount(4);
  await expect(page.locator(".field__control")).toHaveCount(3);
  await expect(page.locator(".field__control--body")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Private editor title");
  await expect(page.getByLabel("Body")).toHaveValue("Private editor body");
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Private editor title" })).toBeVisible();
  await expect(page.getByText("Private editor body")).toBeVisible();
  await noteLink.click();
  await expect(page.getByRole("heading", { name: "Edit note" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pin" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Restore" })).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();
  await page.getByRole("button", { name: "Pin" }).click();
  await expect(page.getByRole("button", { name: "Unpin" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Unpin" })).toBeVisible();
  await page.getByRole("button", { name: "Unpin" }).click();
  await expect(page.getByRole("button", { name: "Pin" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Pin" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cancel" })).toBeVisible();
  await page.getByLabel("Title").fill("Saved editor title");
  await page.getByLabel("Body").fill("Saved editor body");
  await expect(page.getByRole("status")).not.toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.reload();
  await expect(page.getByLabel("Title")).toHaveValue("Saved editor title");
  await expect(page.getByLabel("Body")).toHaveValue("Saved editor body");

  await page.getByLabel("Title").fill("Discarded editor title");
  await page.getByLabel("Body").fill("Discarded editor body");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Discard changes?" })).toBeVisible();
  await expect(page.locator(".modal")).toHaveAttribute("role", "dialog");
  await expect(page.locator(".modal__dialog")).toBeVisible();
  await expect(page.locator(".modal__actions")).toBeVisible();
  await expect(page.locator(".modal .button--secondary")).toHaveText("Keep editing");
  await expect(page.locator(".modal .button--danger")).toHaveText("Discard");
  await page.getByRole("button", { name: "Stay" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Discarded editor title");
  await expect(page.getByLabel("Body")).toHaveValue("Discarded editor body");
  await page.getByRole("link", { name: "Cancel" }).click();
  await page.getByRole("link", { name: "Discard changes" }).click();
  await expect(page.getByRole("heading", { name: "Saved editor title" })).toBeVisible();
  await page.getByRole("link", { name: "Saved editor title" }).click();
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

test("renders and completes the delete confirmation", async ({ page }) => {
  await signUp(page, "delete-editor");
  await page.getByLabel("Title").fill("Delete this test note");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("heading", { name: "Delete this test note" })).toBeVisible();
  await page.getByRole("link", { name: "Delete this test note" }).click();
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.locator(".modal");
  await expect(dialog).toHaveAttribute("role", "dialog");
  await expect(dialog.locator(".modal__dialog")).toBeVisible();
  await expect(dialog.locator(".mb-4")).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Delete this note permanently?" }),
  ).toBeVisible();
  await expect(dialog.getByText("Delete this test note", { exact: false })).toBeVisible();
  await expect(dialog.locator(".button--secondary")).toHaveText("Cancel");
  await expect(dialog.locator(".button--danger")).toHaveText("Delete permanently");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:5173/");
  await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
});
