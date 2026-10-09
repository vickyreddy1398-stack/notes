import { expect, test } from "@playwright/test";
import { db } from "../../api/src/db";
import { notes, noteTags, tags } from "../../api/src/db/schema";
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

test("combines active search with one available tag and keeps archived unfiltered", async ({
  page,
}) => {
  await signUp(page);
  const ownerId = await page.evaluate(async () => {
    const response = await fetch("http://127.0.0.1:3001/api/trpc/users.currentUser", {
      credentials: "include",
    });
    return ((await response.json()) as { result: { data: { id: string } } }).result.data.id;
  });
  const suffix = `${ownerId}-${Date.now()}`;
  const other = await createUsersService(db).signUp({
    email: `browser-tag-other-${Date.now()}@example.com`,
    password: "password123",
  });
  const [tag] = await db
    .insert(tags)
    .values({ id: `browser-tag-${suffix}`, ownerId, name: "Important" })
    .returning();
  const tagged = `browser-tagged-${suffix}`;
  const untagged = `browser-untagged-${suffix}`;
  const archived = `browser-tag-archived-${suffix}`;
  const privateNote = `browser-tag-private-${suffix}`;
  await db.insert(notes).values([
    { id: tagged, ownerId, title: "Tagged note" },
    { id: untagged, ownerId, title: "Other active note" },
    { id: archived, ownerId, title: "Archived tagged note", archived: true },
    { id: privateNote, ownerId: other.user.id, title: "Private tagged note" },
  ]);
  await db.insert(noteTags).values([
    { noteId: tagged, tagId: tag.id },
    { noteId: archived, tagId: tag.id },
  ]);

  await page.reload();
  await expect(page.getByLabel("Filter by tag")).toContainText("Important");
  await page.getByLabel("Filter by tag").selectOption(tag.id);
  const list = page.getByRole("list", { name: "Active notes" });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("Tagged note");
  await expect(list).not.toContainText("Other active note");
  await expect(list).not.toContainText("Archived tagged note");
  await expect(list).not.toContainText("Private tagged note");

  await page.getByLabel("Search notes").fill("Tagged");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(list).toContainText("Tagged note");
  await expect(list).not.toContainText("Other active note");
  await expect(page.getByLabel("Filter by tag")).toHaveValue(tag.id);
  await expect(page.getByLabel("Search notes")).toHaveValue("Tagged");

  await page.getByLabel("Filter by tag").selectOption("");
  await page.getByLabel("Filter by tag").selectOption(tag.id);
  await expect(page.getByLabel("Filter by tag")).toHaveValue(tag.id);
  await expect(page.getByLabel("Search notes")).toHaveValue("Tagged");

  await page.getByRole("button", { name: "Archived" }).click();
  await expect(page.getByRole("heading", { name: "Archived" })).toBeVisible();
  await expect(page.getByText("Archived tagged note")).toBeVisible();
  await page.getByRole("button", { name: "Notes" }).click();
  await expect(page.getByLabel("Filter by tag")).toHaveValue(tag.id);
  await expect(page.getByLabel("Search notes")).toHaveValue("Tagged");
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
