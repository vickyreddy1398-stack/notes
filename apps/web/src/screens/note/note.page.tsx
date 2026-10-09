import { useEffect, useState } from "react";
import {
  NOTE_BODY_MAX,
  NOTE_TITLE_MAX,
  updateNoteInput,
} from "../../../../api/src/modules/notes/notes.types";
import { trpc } from "../../lib/trpc";

type Props = { id: string };

function normalizeTagDraft(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].join(", ");
}

export function NotePage({ id }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [original, setOriginal] = useState({ title: "", body: "", tags: "" });
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [tags, setTags] = useState("");
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [archiving, setArchiving] = useState(false);
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
        const normalizedTags = (note.tags ?? []).join(", ");
        setOriginal({ title: note.title, body: note.body ?? "", tags: normalizedTags });
        setTags(normalizedTags);
        setPinned(note.pinned);
        setArchived(note.archived);
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
    const parsed = updateNoteInput.safeParse({ id, title, body, tags });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid note");
      return;
    }
    try {
      const note = await trpc.notes.update({ ...parsed.data, tags });
      setTitle(note.title);
      setBody(note.body ?? "");
      const normalizedTags = parsed.data.tags.join(", ");
      setOriginal({ title: note.title, body: note.body ?? "", tags: normalizedTags });
      setTags(normalizedTags);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save note");
    }
  }

  async function changePin(nextPinned: boolean) {
    setPinning(true);
    setError("");
    try {
      const note = nextPinned ? await trpc.notes.pin({ id }) : await trpc.notes.unpin({ id });
      setPinned(note.pinned);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to change pin state");
    } finally {
      setPinning(false);
    }
  }

  async function changeArchive(nextArchived: boolean) {
    setArchiving(true);
    setError("");
    try {
      const note = nextArchived
        ? await trpc.notes.archive({ id })
        : await trpc.notes.restore({ id });
      setArchived(note.archived);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to change archive state");
    } finally {
      setArchiving(false);
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

  const dirty =
    title !== original.title || body !== original.body || normalizeTagDraft(tags) !== original.tags;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
      <h1>Edit note</h1>
      {error && <p role="alert">{error}</p>}
      <p>
        <button type="button" onClick={() => void changePin(!pinned)} disabled={pinning}>
          {pinning ? "Saving…" : pinned ? "Unpin" : "Pin"}
        </button>{" "}
        <button type="button" onClick={() => void changeArchive(!archived)} disabled={archiving}>
          {archiving ? "Saving…" : archived ? "Restore" : "Archive"}
        </button>
      </p>
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
        <label htmlFor="note-editor-tags">Tags</label>
        <input
          id="note-editor-tags"
          name="tags"
          value={tags}
          onChange={(event) => {
            setTags(event.target.value);
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
        <a
          href="/"
          onClick={(event) => {
            if (dirty) {
              event.preventDefault();
              setConfirmingDiscard(true);
            }
          }}
          style={{ marginLeft: "0.75rem" }}
        >
          Cancel
        </a>
      </form>
      {confirmingDiscard && (
        <section aria-labelledby="discard-confirmation-heading">
          <h2 id="discard-confirmation-heading">Discard changes</h2>
          <p>Your unsaved changes will be lost.</p>
          <a href="/">Discard changes</a>
          <button type="button" onClick={() => setConfirmingDiscard(false)}>
            Stay
          </button>
        </section>
      )}
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
