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
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

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
        setCreatedAt(note.createdAt ?? "");
        setUpdatedAt(note.updatedAt ?? "");
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

  const updatedLabel = updatedAt
    ? `Updated ${new Date(updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
    : "Updated recently";
  const createdLabel = createdAt
    ? `Created ${new Date(createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}`
    : "";

  return (
    <main className="note-editor md:ml-60" aria-label="Edit note">
      <form
        id="note-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          void saveNote();
        }}
      >
        <div className="note-editor__header">
          <div>
            <h1>Edit note</h1>
            <p className="text-[var(--color-text-muted)]">Changes are saved explicitly.</p>
          </div>
          <div className="note-editor__actions">
            <button
              className="button button--quiet"
              type="button"
              onClick={() => void changePin(!pinned)}
              disabled={pinning}
            >
              {pinning ? "Saving…" : pinned ? "Unpin" : "Pin"}
            </button>
            <button
              className="button button--quiet"
              type="button"
              onClick={() => void changeArchive(!archived)}
              disabled={archiving}
            >
              {archiving ? "Saving…" : archived ? "Restore" : "Archive"}
            </button>
            <a
              className="button button--secondary"
              href="/"
              onClick={(event) => {
                if (dirty) {
                  event.preventDefault();
                  setConfirmingDiscard(true);
                }
              }}
            >
              Cancel
            </a>
            <button className="button" type="submit">
              Save
            </button>
          </div>
        </div>
        {error && <p role="alert">{error}</p>}
        <label className="field" htmlFor="note-editor-title">
          <span className="field__label">Title</span>
          <input
            className="field__control"
            id="note-editor-title"
            aria-label="Title"
            name="title"
            value={title}
            maxLength={NOTE_TITLE_MAX}
            required
            onChange={(event) => {
              setTitle(event.target.value);
              setSaved(false);
            }}
          />
        </label>
        <label className="field" htmlFor="note-editor-body">
          <span className="field__label">Body</span>
          <textarea
            className="field__control field__control--body"
            id="note-editor-body"
            aria-label="Body"
            name="body"
            value={body}
            maxLength={NOTE_BODY_MAX}
            onChange={(event) => {
              setBody(event.target.value);
              setSaved(false);
            }}
          />
          <span className="field__hint">Plain text only · 50,000 characters maximum</span>
        </label>
        <label className="field" htmlFor="note-editor-tags">
          <span className="field__label">Tags</span>
          <input
            className="field__control"
            id="note-editor-tags"
            aria-label="Tags"
            name="tags"
            value={tags}
            placeholder="ideas, planning"
            onChange={(event) => {
              setTags(event.target.value);
              setSaved(false);
            }}
          />
          <span className="field__hint">
            Separate tags with commas. Tags are saved in lowercase and de-duplicated.
          </span>
        </label>
      </form>
      <div className="note-editor__footer">
        <div className="flex flex-col gap-1">
          <time className="text-[var(--color-text-muted)]" dateTime={updatedAt || undefined}>
            {updatedLabel}
          </time>
          {createdLabel && (
            <span className="text-xs text-[var(--color-text-subtle)]">{createdLabel}</span>
          )}
        </div>
        {!confirmingDelete ? (
          <button
            className="button button--danger"
            type="button"
            aria-label="Delete"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete permanently
          </button>
        ) : (
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <section className="modal__dialog">
              <div
                className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                aria-hidden="true"
              >
                !
              </div>
              <h2 id="delete-title">Delete this note permanently?</h2>
              <p id="delete-description" className="text-[var(--color-text-muted)]">
                “{title}” will be permanently deleted. This action cannot be undone.
              </p>
              <div className="modal__actions">
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="button button--danger"
                  type="button"
                  onClick={() => void deleteNote()}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
      {confirmingDiscard && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-title"
          aria-describedby="discard-description"
        >
          <section className="modal__dialog">
            <h2 id="discard-title">Discard changes?</h2>
            <p id="discard-description">Your unsaved edits to “{title}” will be lost.</p>
            <div className="modal__actions">
              <button
                className="button button--secondary"
                type="button"
                aria-label="Stay"
                onClick={() => setConfirmingDiscard(false)}
              >
                Keep editing
              </button>
              <a className="button button--danger" href="/" aria-label="Discard changes">
                Discard
              </a>
            </div>
          </section>
        </div>
      )}
      {saved && <p role="status">Changes saved.</p>}
    </main>
  );
}
