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

export function NotesPage({ email }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedTagId, setSelectedTagId] = useState("");
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
        const loadedNotes = await trpc.notes.list(parsed.data);
        if (requestId === latestLoad.current) setNotes(loadedNotes);
      } catch (cause) {
        if (requestId === latestLoad.current) {
          setError(cause instanceof Error ? cause.message : "Unable to load notes");
        }
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
    const parsed = createNoteInput.safeParse({
      title,
      body: body || undefined,
      tags: tagDraft,
    });
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

  if (archivedView) return <ArchivedPage onBack={() => setArchivedView(false)} />;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
      <h1>Notes</h1>
      <p>Signed in as {email}</p>
      <button type="button" onClick={() => setArchivedView(true)}>
        Archived
      </button>
      <section aria-labelledby="quick-note-heading">
        <h2 id="quick-note-heading">Quick note</h2>
        <form onSubmit={submit}>
          <label htmlFor="note-title">Title</label>
          <input
            id="note-title"
            name="title"
            value={title}
            maxLength={NOTE_TITLE_MAX}
            required
            onChange={(event) => setTitle(event.target.value)}
            style={{ display: "block", maxWidth: "100%", width: "100%" }}
          />
          <label htmlFor="note-tags">Tags</label>
          <input
            id="note-tags"
            name="tags"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            style={{ display: "block", maxWidth: "100%", width: "100%" }}
          />
          <label htmlFor="note-body">Body</label>
          <textarea
            id="note-body"
            name="body"
            value={body}
            maxLength={NOTE_BODY_MAX}
            onChange={(event) => setBody(event.target.value)}
            style={{ display: "block", maxWidth: "100%", width: "100%" }}
          />
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save note"}
          </button>
        </form>
      </section>
      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
      <section aria-labelledby="main-list-heading">
        <h2 id="main-list-heading">Your notes</h2>
        <form onSubmit={submitSearch}>
          <label htmlFor="note-search">Search notes</label>
          <input
            id="note-search"
            name="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        <label htmlFor="note-tag-filter">Filter by tag</label>
        <select
          id="note-tag-filter"
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
        {loading && <p>Loading notes…</p>}
        {!loading && notes.length === 0 && <p>Create your first note to get started.</p>}
        <ol aria-label="Active notes">
          {notes.map((note) => (
            <li key={note.id}>
              <article>
                <h3>
                  <a href={`/notes/${encodeURIComponent(note.id)}`}>{note.title}</a>
                </h3>
                {note.body && <p style={{ whiteSpace: "pre-wrap" }}>{note.body}</p>}
                {note.tags && note.tags.length > 0 && <p>Tags: {note.tags.join(", ")}</p>}
              </article>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
