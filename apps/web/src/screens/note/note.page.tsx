import { useEffect, useState } from "react";
import { NOTE_BODY_MAX, NOTE_TITLE_MAX } from "../../../../api/src/modules/notes/notes.types";
import { trpc } from "../../lib/trpc";

type Props = { id: string };

export function NotePage({ id }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    trpc.notes
      .get({ id })
      .then((note) => {
        if (!active) return;
        setTitle(note.title);
        setBody(note.body ?? "");
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
  if (error) {
    return (
      <main>
        <h1>Note unavailable</h1>
        <p role="alert">{error}</p>
        <a href="/">Back to Notes</a>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
      <h1>Edit note</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
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
      {saved && <p role="status">Changes are ready to save.</p>}
    </main>
  );
}
