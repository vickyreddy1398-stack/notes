import { useCallback, useEffect, useRef, useState } from "react";
import {
  createNoteInput,
  listNotesInput,
  NOTE_BODY_MAX,
  NOTE_TITLE_MAX,
} from "../../../../api/src/modules/notes/notes.types";
import { trpc } from "../../lib/trpc";
import { ArchivedPage } from "../archived/archived.page";

type Note = Awaited<ReturnType<typeof trpc.notes.list>>[number];
type Props = { email: string };

function updatedLabel(value: string) {
  const date = new Date(value);
  return `Updated ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function NotesPage({ email }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedTagId, setSelectedTagId] = useState(
    () => new URLSearchParams(window.location.search).get("tag") ?? "",
  );
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archivedView, setArchivedView] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const latestLoad = useRef(0);

  const loadNotes = useCallback(
    async (searchOverride = search) => {
      const requestId = ++latestLoad.current;
      const input = selectedTagId
        ? { tagId: selectedTagId }
        : searchOverride
          ? { search: searchOverride }
          : {};
      const parsed = listNotesInput.safeParse(input);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid note filter");
        setLoading(false);
        return;
      }
      try {
        const loaded = await trpc.notes.list(parsed.data);
        if (requestId === latestLoad.current) setNotes(loaded);
      } catch (cause) {
        if (requestId === latestLoad.current)
          setError(cause instanceof Error ? cause.message : "Unable to load notes");
      } finally {
        if (requestId === latestLoad.current) setLoading(false);
      }
    },
    [search, selectedTagId],
  );

  useEffect(() => {
    void loadNotes();
    trpc.tags
      .list()
      .then(setTags)
      .catch(() => undefined);
  }, [loadNotes]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    const parsed = createNoteInput.safeParse({ title, body: body || undefined, tags: tagDraft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid note");
      return;
    }
    setSaving(true);
    try {
      await trpc.notes.create({ ...parsed.data, tags: tagDraft });
      await loadNotes();
      setTitle("");
      setBody("");
      setTagDraft("");
      setStatus("Note saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save note");
    } finally {
      setSaving(false);
    }
  }
  async function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = listNotesInput.safeParse({ search: searchDraft || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid search");
      return;
    }
    setSelectedTagId("");
    setSearch("search" in parsed.data ? parsed.data.search : "");
  }
  function selectTag(tagId: string) {
    setSelectedTagId(tagId);
    setSearchDraft("");
    setSearch("");
  }
  async function noteAction(note: Note, action: "pin" | "unpin" | "archive") {
    setBusyId(note.id);
    setError("");
    try {
      if (action === "pin") await trpc.notes.pin({ id: note.id });
      else if (action === "unpin") await trpc.notes.unpin({ id: note.id });
      else await trpc.notes.archive({ id: note.id });
      await loadNotes();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update note");
    } finally {
      setBusyId(null);
    }
  }

  if (archivedView) return <ArchivedPage onBack={() => setArchivedView(false)} />;
  return (
    <main className="ml-0 md:ml-60">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
              Workspace
            </p>
            <h1>Notes</h1>
            <p className="mb-0 text-[var(--color-text-muted)]">
              Capture a thought, then find it when you need it.
            </p>
          </div>
          <span className="hidden rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] sm:inline-flex">
            {notes.length} active notes
          </span>
        </div>
        <p>Signed in as {email}</p>
        <button
          className="button button--quiet"
          type="button"
          onClick={() => setArchivedView(true)}
        >
          Archived
        </button>
        <h2>Quick note</h2>
        <form className="quick-capture" aria-label="Create a new note" onSubmit={submit}>
          <div className="quick-capture__row">
            <span className="mt-1 text-lg text-[var(--color-accent)]" aria-hidden="true">
              ✦
            </span>
            <input
              className="quick-capture__title"
              id="note-title"
              type="text"
              required
              maxLength={NOTE_TITLE_MAX}
              placeholder="Write a note title…"
              aria-label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <textarea
            className="quick-capture__body"
            id="note-body"
            maxLength={NOTE_BODY_MAX}
            placeholder="Add a thought, if you like"
            aria-label="Body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="quick-capture__actions">
            <input
              className="field__control min-w-0 flex-1"
              id="note-tags"
              type="text"
              placeholder="tags, comma-separated"
              aria-label="Tags"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
            />
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </form>
        <div className="workspace-toolbar">
          <form onSubmit={submitSearch} className="contents">
            <input
              className="field__control workspace-toolbar__search"
              type="search"
              placeholder="Search notes by title or body…"
              aria-label="Search notes"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            <button className="button button--secondary" type="submit">
              Search
            </button>
          </form>
          <section className="workspace-toolbar__filters" aria-label="Filter notes by one tag">
            <button
              className={`tag tag--filter${!selectedTagId ? " is-selected" : ""}`}
              type="button"
              onClick={() => selectTag("")}
            >
              All notes
            </button>
            {tags.map((tag) => (
              <button
                className={`tag tag--filter${selectedTagId === tag.id ? " is-selected" : ""}`}
                type="button"
                key={tag.id}
                onClick={() => selectTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </section>
          <label className="sr-only" htmlFor="note-tag-filter">
            Filter by tag
          </label>
          <select
            className="sr-only"
            id="note-tag-filter"
            aria-label="Filter by tag"
            value={selectedTagId}
            onChange={(event) => selectTag(event.target.value)}
          >
            <option value="">All active notes</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
        {status && <p role="status">{status}</p>}
        {error && <p role="alert">{error}</p>}
        {loading && <p>Loading notes…</p>}
        {!loading && notes.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden="true">
              ✦
            </div>
            <h2>No notes yet</h2>
            <p className="empty-state__hint">Create your first note to get started.</p>
          </div>
        )}
        {!loading && notes.length > 0 && (
          // biome-ignore lint/a11y/useSemanticElements: the approved design requires section/article landmarks
          <section className="note-list" aria-label="Active notes" role="list">
            {notes.map((note) => (
              // biome-ignore lint/a11y/useSemanticElements: the approved design requires article cards
              <article className="note-row" key={note.id} role="listitem">
                <div className="note-row__content">
                  <a href={`/notes/${encodeURIComponent(note.id)}`} className="block">
                    <h3 className="note-row__title">{note.title}</h3>
                    {note.body && <p className="note-row__preview">{note.body}</p>}
                  </a>
                  <div className="note-row__meta">
                    {note.tags?.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                    {note.tags && note.tags.length > 0 && <span>Tags: {note.tags.join(", ")}</span>}
                    <time dateTime={note.updatedAt}>{updatedLabel(note.updatedAt)}</time>
                    {note.pinned && (
                      <span role="img" aria-label="Pinned">
                        · Pinned
                      </span>
                    )}
                  </div>
                </div>
                <div className="note-row__actions">
                  <button
                    className="button button--quiet"
                    type="button"
                    disabled={busyId !== null}
                    aria-label={note.pinned ? "Unpin note" : "Pin note"}
                    onClick={() => void noteAction(note, note.pinned ? "unpin" : "pin")}
                  >
                    {note.pinned ? "★" : "☆"}
                  </button>
                  <button
                    className="button button--quiet"
                    type="button"
                    disabled={busyId !== null}
                    aria-label="Archive note"
                    onClick={() => void noteAction(note, "archive")}
                  >
                    Archive
                  </button>
                  <a
                    className="button button--secondary"
                    href={`/notes/${encodeURIComponent(note.id)}`}
                  >
                    Open
                  </a>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
