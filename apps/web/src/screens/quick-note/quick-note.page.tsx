import { useState } from "react";
import {
  createNoteInput,
  NOTE_BODY_MAX,
  NOTE_TITLE_MAX,
} from "../../../../api/src/modules/notes/notes.types";
import { trpc } from "../../lib/trpc";

export const quickNoteInput = createNoteInput;

type Props = { email: string };
export function QuickNotePage({ email }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = quickNoteInput.safeParse({ title, body: body || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid note");
      return;
    }
    try {
      await trpc.notes.create(parsed.data);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save note");
    }
  }
  return (
    <main>
      <h1>Notes</h1>
      <p>Signed in as {email}</p>
      <h2>Quick note</h2>
      <form onSubmit={submit}>
        <label htmlFor="note-title">Title</label>
        <input
          id="note-title"
          name="title"
          value={title}
          maxLength={NOTE_TITLE_MAX}
          required
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="note-body">Body</label>
        <textarea
          id="note-body"
          name="body"
          value={body}
          maxLength={NOTE_BODY_MAX}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit">Save note</button>
      </form>
      {saved && <p role="status">Note saved</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
