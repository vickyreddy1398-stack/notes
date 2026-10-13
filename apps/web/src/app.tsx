import { useEffect, useState } from "react";
import { AppShell } from "./components/app-shell/app-shell";
import { trpc } from "./lib/trpc";
import { ArchivedPage } from "./screens/archived/archived.page";
import { NotePage } from "./screens/note/note.page";
import { NotesPage } from "./screens/notes/notes.page";
import { SignInPage } from "./screens/sign-in/sign-in.page";
import { SignUpPage } from "./screens/sign-up/sign-up.page";

function SignedInWorkspace({
  archived = false,
  fallback = "signin",
}: {
  archived?: boolean;
  fallback?: "signin" | "signup";
}) {
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
  if (!email) return fallback === "signup" ? <SignUpPage /> : <SignInPage />;
  return (
    <AppShell email={email} activeScreen={archived ? "archived" : "notes"}>
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
    <AppShell email={email} activeScreen="notes">
      <NotePage id={id} />
    </AppShell>
  );
}

export function App() {
  const noteMatch = window.location.pathname.match(/^\/notes\/([^/]+)$/);
  if (noteMatch) return <SignedInNote id={decodeURIComponent(noteMatch[1])} />;
  if (window.location.pathname === "/archived") return <SignedInWorkspace archived />;
  if (window.location.pathname === "/sign-in") return <SignInPage />;
  if (window.location.pathname === "/") return <SignedInWorkspace fallback="signup" />;
  return <SignUpPage />;
}
