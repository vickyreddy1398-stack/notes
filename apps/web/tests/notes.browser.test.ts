import { expect, test } from "@playwright/test";
import { db } from "../../api/src/db";
import { notes } from "../../api/src/db/schema";
import { createUsersService } from "../../api/src/modules/users/users.service";

async function signUp(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill(`notes-list-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Quick note" })).toBeVisible();
}

test("searches only matching active notes owned by the signed-in user", async ({ page }) => {
  await signUp(page);
  const ownerId = await page.evaluate(async () => {
    const response = await fetch("http://127.0.0.1:3001/api/trpc/users.currentUser", {
      credentials: "include",
    });
    return ((await response.json()) as { result: { data: { id: string } } }).result.data.id;
  });
  const other = await createUsersService(db).signUp({
    email: `browser-search-other-${Date.now()}@example.com`,
    password: "password123",
  });
  const suffix = `${ownerId}-${Date.now()}`;
  await db.insert(notes).values([
    { id: `browser-search-title-${suffix}`, ownerId, title: "Project Planning" },
    {
      id: `browser-search-body-${suffix}`,
      ownerId,
      title: "Other title",
      body: "Details for PROJECT planning",
    },
    {
      id: `browser-search-archived-${suffix}`,
      ownerId,
      title: "Archived project planning",
      archived: true,
    },
    { id: `browser-search-other-${suffix}`, ownerId, title: "Completely unrelated" },
    { id: `browser-search-private-${suffix}`, ownerId: other.user.id, title: "Project Planning" },
  ]);

  await page.getByLabel("Search notes").fill("pRoJeCt");
  await page.getByRole("button", { name: "Search" }).click();
  const list = page.getByRole("list", { name: "Active notes" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list).toContainText("Project Planning");
  await expect(list).toContainText("Other title");
  await expect(list).not.toContainText("Archived project planning");
  await expect(list).not.toContainText("Completely unrelated");
});

test("renders active notes in the required order", async ({ page }) => {
  await signUp(page);

  const ownerId = await page.evaluate(async () => {
    const response = await fetch("http://127.0.0.1:3001/api/trpc/users.currentUser", {
      credentials: "include",
    });
    const payload = await response.json();
    return payload.result.data.id as string;
  });
  const suffix = `${ownerId}-${Date.now()}`;
  const old = new Date("2025-01-01T00:00:00.000Z");
  const tieUpdated = new Date("2025-01-02T00:00:00.000Z");
  const newest = new Date("2025-01-03T00:00:00.000Z");

  await db.insert(notes).values([
    {
      id: `browser-pinned-${suffix}`,
      ownerId,
      title: "Pinned old",
      body: "Pinned body",
      pinned: true,
      createdAt: old,
      updatedAt: old,
    },
    {
      id: `browser-updated-${suffix}`,
      ownerId,
      title: "Updated newest",
      body: "Updated body",
      createdAt: old,
      updatedAt: newest,
    },
    {
      id: `browser-tie-new-${suffix}`,
      ownerId,
      title: "Tie created newest",
      body: "Tie new body",
      createdAt: newest,
      updatedAt: tieUpdated,
    },
    {
      id: `browser-tie-old-${suffix}`,
      ownerId,
      title: "Tie created old",
      body: "Tie old body",
      createdAt: old,
      updatedAt: tieUpdated,
    },
    {
      id: `browser-archived-${suffix}`,
      ownerId,
      title: "Archived hidden",
      body: "Should not render",
      archived: true,
      createdAt: newest,
      updatedAt: newest,
    },
  ]);

  await page.reload();
  const list = page.getByRole("list", { name: "Active notes" });
  await expect(list.getByRole("listitem")).toHaveCount(4);
  await expect(list.getByRole("heading", { level: 3 })).toHaveText([
    "Pinned old",
    "Updated newest",
    "Tie created newest",
    "Tie created old",
  ]);
  await expect(list).toContainText("Pinned body");
  await expect(list).toContainText("Tie old body");
  await expect(page.getByText("Archived hidden")).toHaveCount(0);
});
