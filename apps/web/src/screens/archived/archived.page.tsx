import { useCallback, useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

type Note = Awaited<ReturnType<typeof trpc.notes.archived>>[number];

type Props = { onBack: () => void };

export function ArchivedPage({ onBack }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotes = useCallback(async () => {
    try {
      setNotes(await trpc.notes.archived());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load archived notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  async function restore(id: string) {
    setError("");
    try {
      await trpc.notes.restore({ id });
      setNotes((current) => current.filter((note) => note.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restore note");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "1rem" }}>
      <button type="button" onClick={onBack}>
        Notes
      </button>
      <h1>Archived</h1>
      {loading && <p>Loading archived notes…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && notes.length === 0 && <p>Create your first note to get started.</p>}
      <ol>
        {notes.map((note) => (
          <li key={note.id}>
            <span>{note.title}</span>{" "}
            <button type="button" onClick={() => void restore(note.id)}>
              Restore
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}
