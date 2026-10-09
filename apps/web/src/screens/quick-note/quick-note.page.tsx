import { NotesPage } from "../notes/notes.page";

/** @deprecated Notes owns quick entry now. */
export function QuickNotePage({ email }: { email: string }) {
  return <NotesPage email={email} />;
}
