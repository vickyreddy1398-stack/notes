import { useCallback, useEffect, useRef, useState } from "react";
import {
  createNoteInput,
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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archivedView, setArchivedView] = useState(false);
  const latestLoad = useRef(0);

  const loadNotes = useCallback(async () => {
    const requestId = ++latestLoad.current;
    try {
      const loadedNotes = await trpc.notes.list(selectedTagId ? { tagId: selectedTagId } : {});
      if (requestId === latestLoad.current) setNotes(loadedNotes);
    } catch (cause) {
      if (requestId === latestLoad.current) {
        setError(cause instanceof Error ? cause.message : "Unable to load notes");
      }
    } finally {
      if (requestId === latestLoad.current) setLoading(false);
    }
  }, [selectedTagId]);

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
    const parsed = createNoteInput.safeParse({ title, body: body || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid note");
      return;
    }
    setSaving(true);
    try {
      await trpc.notes.create(parsed.data);
      await loadNotes();
      setTitle("");
      setBody("");
      setStatus("Note saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save note");
    } finally {
      setSaving(false);
    }
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
        <label htmlFor="note-tag-filter">Filter by tag</label>
        <select
          id="note-tag-filter"
          value={selectedTagId}
          onChange={(event) => setSelectedTagId(event.target.value)}
        >
          <option value="">All active notes</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        {loading && <p>Loading notes…</p>}
        {!loading && notes.length === 0 && <p>No notes yet.</p>}
        <ol aria-label="Active notes">
          {notes.map((note) => (
            <li key={note.id}>
              <article>
                <h3>
                  <a href={`/notes/${encodeURIComponent(note.id)}`}>{note.title}</a>
                </h3>
                {note.body && <p style={{ whiteSpace: "pre-wrap" }}>{note.body}</p>}
              </article>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
