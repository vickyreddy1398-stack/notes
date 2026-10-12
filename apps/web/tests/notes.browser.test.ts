import { expect, test } from "@playwright/test";
import { db } from "../../api/src/db";
import { notes, noteTags, tags } from "../../api/src/db/schema";
import { createNotesService } from "../../api/src/modules/notes/notes.service";
import { createUsersService } from "../../api/src/modules/users/users.service";

async function signUp(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill(`notes-list-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Quick note" })).toBeVisible();
}

test("renders the approved shell and note-row structure", async ({ page }) => {
  await signUp(page);
  await expect(page.locator("header.topbar")).toBeVisible();
  await expect(page.locator("aside.sidebar")).toBeVisible();
  await expect(page.locator("main.ml-0.md\\:ml-60")).toBeVisible();
  await page.getByLabel("Title").fill("Design review note");
  await page.getByRole("button", { name: "Save note" }).click();
  const list = page.locator("section.note-list");
  await expect(list).toBeVisible();
  await expect(list.locator("article.note-row")).toHaveCount(1);
});

test("sidebar Archived uses the archived route and sidebar tags filter notes", async ({ page }) => {
  await signUp(page);
  const ownerId = await page.evaluate(async () => {
    const response = await fetch("http://127.0.0.1:3001/api/trpc/users.currentUser", {
      credentials: "include",
    });
    return ((await response.json()) as { result: { data: { id: string } } }).result.data.id;
  });
  const suffix = `${ownerId}-${Date.now()}`;
  const [tag] = await db
    .insert(tags)
    .values({ id: `browser-sidebar-tag-${suffix}`, ownerId, name: "Sidebar" })
    .returning();
  const noteId = `browser-sidebar-note-${suffix}`;
  await db.insert(notes).values({ id: noteId, ownerId, title: "Sidebar filtered note" });
  await db.insert(noteTags).values({ noteId, tagId: tag.id });

  await page.reload();
  await page.locator("aside.sidebar").getByRole("link", { name: "Sidebar" }).click();
  await expect(page).toHaveURL(`/?tag=${tag.id}`);
  await expect(page.locator("article.note-row")).toContainText("Sidebar filtered note");
  await page.locator("aside.sidebar").getByRole("link", { name: "Archived" }).click();
  await expect(page).toHaveURL("/archived");
  await expect(page.getByRole("heading", { name: "Archived", exact: true })).toBeVisible();
});

test("shows a create-first-note hint for empty active, search, and tag results", async ({
  page,
}) => {
  await signUp(page);
  const hint = page.getByText("Create your first note to get started.");
  await expect(hint).toBeVisible();

  await page.getByLabel("Search notes").fill("missing");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(hint).toBeVisible();

  const ownerId = await page.evaluate(async () => {
    const response = await fetch("http://127.0.0.1:3001/api/trpc/users.currentUser", {
      credentials: "include",
    });
    return ((await response.json()) as { result: { data: { id: string } } }).result.data.id;
  });
  const [tag] = await db
    .insert(tags)
    .values({ id: `browser-empty-tag-${ownerId}-${Date.now()}`, ownerId, name: "Empty" })
    .returning();
  const temporaryNoteId = `browser-empty-tag-note-${ownerId}-${Date.now()}`;
  await db.insert(notes).values({ id: temporaryNoteId, ownerId, title: "Temporary" });
  await db.insert(noteTags).values({ noteId: temporaryNoteId, tagId: tag.id });
  await page.reload();
  await expect(page.getByLabel("Filter by tag")).toContainText("Empty");
  await createNotesService(db).archive(ownerId, temporaryNoteId);
  await page.getByLabel("Filter by tag").selectOption(tag.id);
  await expect(hint).toBeVisible();
});

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

test("keeps search and tag filtering independent and keeps archived unfiltered", async ({
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
  await expect(page.getByLabel("Filter by tag")).toHaveValue("");
  await expect(page.getByLabel("Search notes")).toHaveValue("Tagged");

  await page.getByLabel("Filter by tag").selectOption(tag.id);
  await expect(page.getByLabel("Filter by tag")).toHaveValue(tag.id);
  await expect(page.getByLabel("Search notes")).toHaveValue("");

  await page.getByRole("button", { name: "Archived" }).click();
  await expect(page.getByRole("heading", { name: "Archived", exact: true })).toBeVisible();
  await expect(page.getByText("Archived tagged note")).toBeVisible();
  await page.getByRole("button", { name: "Notes" }).click();
  await expect(page.getByLabel("Filter by tag")).toHaveValue(tag.id);
  await expect(page.getByLabel("Search notes")).toHaveValue("");
});

test("removes unused tags after replacing tags and permanently deleting a note", async ({
  page,
}) => {
  await signUp(page);

  async function createNote(title: string) {
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }

  await createNote("First tagged note");
  await page.getByRole("link", { name: "First tagged note" }).click();
  await expect(page.getByRole("heading", { name: "Edit note" })).toBeVisible();
  await page.getByLabel("Tags").fill("orphan, shared");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.getByRole("link", { name: "Cancel" }).click();

  await createNote("Second tagged note");
  await page.getByRole("link", { name: "Second tagged note" }).click();
  await page.getByLabel("Tags").fill("shared");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.getByRole("link", { name: "Cancel" }).click();
  await page.reload();
  await expect(page.getByLabel("Filter by tag")).toContainText("orphan");
  await expect(page.getByLabel("Filter by tag")).toContainText("shared");

  await page.getByRole("link", { name: "First tagged note" }).click();
  await page.getByLabel("Tags").fill("shared");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.getByRole("link", { name: "Cancel" }).click();
  await page.reload();
  await expect(page.getByLabel("Filter by tag")).not.toContainText("orphan");
  await expect(page.getByLabel("Filter by tag")).toContainText("shared");

  await createNote("Delete-only tagged note");
  await page.getByRole("link", { name: "Delete-only tagged note" }).click();
  await page.getByLabel("Tags").fill("delete-only");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Changes saved.");
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "Delete this note permanently?" })).toBeVisible();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL("/");
  await page.reload();
  await expect(page.getByLabel("Filter by tag")).not.toContainText("delete-only");
  await expect(page.getByLabel("Filter by tag")).toContainText("shared");
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
