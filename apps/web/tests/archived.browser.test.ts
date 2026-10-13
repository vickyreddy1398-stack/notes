import { expect, test } from "@playwright/test";
import { db } from "../../api/src/db";
import { notes } from "../../api/src/db/schema";
import { createUsersService } from "../../api/src/modules/users/users.service";

async function signUp(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill(`archived-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
}

async function currentUserId(page: import("@playwright/test").Page) {
  const payload = await page.evaluate(async () => {
    const response = await fetch("http://127.0.0.1:3001/api/trpc/users.currentUser", {
      credentials: "include",
    });
    return (await response.json()) as { result: { data: { id: string } } };
  });
  return payload.result.data.id;
}

async function openArchived(page: import("@playwright/test").Page) {
  await page.locator("aside.sidebar").getByRole("link", { name: "Archived" }).click();
  await expect(page).toHaveURL("/archived");
  await expect(page.getByRole("heading", { name: "Archived", exact: true })).toBeVisible();
}

test("shows the approved archived design without exposing private bodies", async ({ page }) => {
  await signUp(page);
  const ownerId = await currentUserId(page);
  const other = await createUsersService(db).signUp({
    email: `archived-other-${Date.now()}@example.com`,
    password: "password123",
  });
  const suffix = `${ownerId}-${Date.now()}`;
  const updated = new Date("2025-01-02T00:00:00.000Z");
  await db.insert(notes).values([
    {
      id: `archived-new-${suffix}`,
      ownerId,
      title: "Newest archived",
      body: "Private body must not be shown",
      archived: true,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-03T00:00:00.000Z"),
    },
    {
      id: `archived-tie-z-${suffix}`,
      ownerId,
      title: "Tie z",
      body: "Another private body",
      archived: true,
      createdAt: updated,
      updatedAt: updated,
    },
    {
      id: `archived-tie-a-${suffix}`,
      ownerId,
      title: "Tie a",
      body: "Do not expose this body",
      archived: true,
      createdAt: updated,
      updatedAt: updated,
    },
    { id: `active-${suffix}`, ownerId, title: "Active hidden" },
    {
      id: `other-${suffix}`,
      ownerId: other.user.id,
      title: "Other user's note",
      archived: true,
    },
  ]);

  await openArchived(page);
  await expect(page.locator("main.ml-0")).toBeVisible();
  await expect(page.locator(".sidebar__item").filter({ hasText: "Archived" })).toHaveClass(
    /is-current/,
  );
  const list = page.locator(".note-list");
  await expect(list.locator(".note-row")).toHaveCount(3);
  await expect(list.locator(".note-row__title")).toHaveText(["Newest archived", "Tie z", "Tie a"]);
  await expect(list).not.toContainText("Private body must not be shown");
  await expect(list).not.toContainText("Another private body");
  await expect(list).not.toContainText("Do not expose this body");
  await expect(list).not.toContainText("Active hidden");
  await expect(list).not.toContainText("Other user's note");
  await expect(list.locator(".note-row__actions .button--quiet")).toHaveCount(3);
});

test("restores an archived note and removes it from the view", async ({ page }) => {
  await signUp(page);
  const ownerId = await currentUserId(page);
  const id = `restore-browser-${ownerId}-${Date.now()}`;
  const originalUpdatedAt = new Date("2025-02-03T04:05:06.000Z");
  await db.insert(notes).values({
    id,
    ownerId,
    title: "Restore me",
    archived: true,
    updatedAt: originalUpdatedAt,
  });

  await openArchived(page);
  const row = page.locator(".note-row").filter({ hasText: "Restore me" });
  const restoreButton = row.locator("button");
  await page.route("**/api/trpc/notes.restore", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.continue();
  });
  await restoreButton.click();
  await expect(restoreButton).toBeDisabled();
  await expect(row).toHaveCount(0);
  const rows = await db.select().from(notes);
  const restored = rows.find((note) => note.id === id);
  expect(restored?.archived).toBe(false);
  expect(restored?.updatedAt.getTime()).toBe(originalUpdatedAt.getTime());
});

test("shows a create-first-note hint when there are no archived notes", async ({ page }) => {
  await signUp(page);
  await openArchived(page);
  await expect(page.getByText("Nothing archived yet")).toBeVisible();
});
