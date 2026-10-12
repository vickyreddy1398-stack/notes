import { useEffect, useState } from "react";
import { AppShell } from "./components/app-shell/app-shell";
import { trpc } from "./lib/trpc";
import { ArchivedPage } from "./screens/archived/archived.page";
import { NotePage } from "./screens/note/note.page";
import { NotesPage } from "./screens/notes/notes.page";
import { SignInPage } from "./screens/sign-in/sign-in.page";
import { SignUpPage } from "./screens/sign-up/sign-up.page";

function SignedInWorkspace({ archived = false }: { archived?: boolean }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    trpc.users
      .currentUser()
      .then((user) => setEmail(user.email))
      .catch(() => setEmail(""));
  }, []);
  if (email === null)
    return (
      <main>
        <p>Loading…</p>
      </main>
    );
  if (!email) return <SignInPage />;
  return (
    <AppShell email={email}>
      {archived ? (
        <ArchivedPage
          onBack={() => {
            window.location.href = "/";
          }}
        />
      ) : (
        <NotesPage email={email} />
      )}
    </AppShell>
  );
}

function SignedInNote({ id }: { id: string }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    trpc.users
      .currentUser()
      .then((user) => setEmail(user.email))
      .catch(() => setEmail(""));
  }, []);
  if (email === null)
    return (
      <main>
        <p>Loading…</p>
      </main>
    );
  if (!email) return <SignInPage />;
  return (
    <AppShell email={email}>
      <NotePage id={id} />
    </AppShell>
  );
}

export function App() {
  const noteMatch = window.location.pathname.match(/^\/notes\/([^/]+)$/);
  if (noteMatch) return <SignedInNote id={decodeURIComponent(noteMatch[1])} />;
  if (window.location.pathname === "/archived") return <SignedInWorkspace archived />;
  if (window.location.pathname === "/sign-in") return <SignInPage />;
  return <SignUpPage />;
}
