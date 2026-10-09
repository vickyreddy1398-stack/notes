import { useEffect, useState } from "react";
import {
  NOTE_BODY_MAX,
  NOTE_TITLE_MAX,
  updateNoteInput,
} from "../../../../api/src/modules/notes/notes.types";
import { trpc } from "../../lib/trpc";

type Props = { id: string };

export function NotePage({ id }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    trpc.notes
      .get({ id })
      .then((note) => {
        if (!active) return;
        setTitle(note.title);
        setBody(note.body ?? "");
        setLoaded(true);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load note");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading)
    return (
      <main>
        <p>Loading note…</p>
      </main>
    );
  if (error && !loaded) {
    return (
      <main>
        <h1>Note unavailable</h1>
        <p role="alert">{error}</p>
        <a href="/">Back to Notes</a>
      </main>
    );
  }

  async function saveNote() {
    setError("");
    setSaved(false);
    const parsed = updateNoteInput.safeParse({ id, title, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid note");
      return;
    }
    try {
      const note = await trpc.notes.update(parsed.data);
      setTitle(note.title);
      setBody(note.body ?? "");
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save note");
    }
  }

  async function deleteNote() {
    setDeleting(true);
    setError("");
    try {
      await trpc.notes.delete({ id });
      window.location.href = "/";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete note");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
      <h1>Edit note</h1>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void saveNote();
        }}
      >
        <label htmlFor="note-editor-title">Title</label>
        <input
          id="note-editor-title"
          name="title"
          value={title}
          maxLength={NOTE_TITLE_MAX}
          required
          onChange={(event) => {
            setTitle(event.target.value);
            setSaved(false);
          }}
          style={{ display: "block", maxWidth: "100%", width: "100%" }}
        />
        <label htmlFor="note-editor-body">Body</label>
        <textarea
          id="note-editor-body"
          name="body"
          value={body}
          maxLength={NOTE_BODY_MAX}
          onChange={(event) => {
            setBody(event.target.value);
            setSaved(false);
          }}
          style={{ display: "block", maxWidth: "100%", width: "100%" }}
        />
        <button type="submit">Save</button>
        <a href="/" style={{ marginLeft: "0.75rem" }}>
          Cancel
        </a>
      </form>
      {!confirmingDelete ? (
        <button type="button" onClick={() => setConfirmingDelete(true)}>
          Delete
        </button>
      ) : (
        <section aria-labelledby="delete-confirmation-heading">
          <h2 id="delete-confirmation-heading">Delete confirmation</h2>
          <p>This note will be permanently deleted.</p>
          <button type="button" onClick={() => void deleteNote()} disabled={deleting}>
            {deleting ? "Deleting…" : "Confirm Delete"}
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
            Cancel
          </button>
        </section>
      )}
      {saved && <p role="status">Changes saved.</p>}
    </main>
  );
}
