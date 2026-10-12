import { useCallback, useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

type Note = Awaited<ReturnType<typeof trpc.notes.archived>>[number];
type Props = { onBack: () => void };

function updatedLabel(value: Date | string | null) {
  return value
    ? `Updated ${new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
    : "Updated recently";
}

export function ArchivedPage({ onBack }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

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
    setRestoringId(id);
    try {
      await trpc.notes.restore({ id });
      setNotes((current) => current.filter((note) => note.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restore note");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <main className="ml-0 min-h-[calc(100vh-4rem)] px-4 py-10 sm:px-6 lg:ml-[15rem] lg:px-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button className="button button--quiet" type="button" onClick={onBack}>
                Notes
              </button>
              <h1>Archived</h1>
              <p className="mb-0 text-[var(--color-text-muted)]">
                Notes you’ve set aside. Restore one whenever you need it again.
              </p>
            </div>
            <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5 text-sm text-[var(--color-text-muted)]">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
          </div>
        </header>
        {loading && <p>Loading archived notes…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && notes.length === 0 ? (
          <section className="empty-state" aria-label="No archived notes">
            <div className="empty-state__icon" aria-hidden="true">
              ▱
            </div>
            <h2>Nothing archived yet</h2>
            <p className="empty-state__hint">Notes you archive will appear here.</p>
            <button className="button button--secondary" type="button" onClick={onBack}>
              Back to Notes
            </button>
          </section>
        ) : (
          <section className="note-list" aria-label="Archived notes">
            {notes.map((note) => (
              <article className="note-row" key={note.id}>
                <div className="note-row__content">
                  <h2 className="note-row__title">{note.title}</h2>
                  <div className="note-row__meta">
                    {(note.tags ?? []).map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                    {note.pinned && <span>Pinned</span>}
                    <time dateTime={note.updatedAt?.toString()}>
                      {updatedLabel(note.updatedAt)}
                    </time>
                  </div>
                </div>
                <div className="note-row__actions">
                  <button
                    className="button button--quiet"
                    type="button"
                    disabled={restoringId !== null}
                    onClick={() => void restore(note.id)}
                  >
                    {restoringId === note.id ? "Restoring…" : "Restore"}
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
