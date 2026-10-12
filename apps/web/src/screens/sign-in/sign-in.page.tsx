import { useEffect, useState } from "react";
import { signInInput } from "../../../../api/src/modules/users/users.types";
import { AppShell } from "../../components/app-shell/app-shell";
import { trpc } from "../../lib/trpc";
import { NotesPage } from "../notes/notes.page";

type User = { id?: string; email: string };

export function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    trpc.users
      .currentUser()
      .then(setUser)
      .catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = signInInput.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email or password");
      return;
    }
    try {
      setUser(await trpc.users.signIn(parsed.data));
    } catch {
      setError("Invalid email or password");
    }
  }

  if (user)
    return (
      <AppShell email={user.email} activeScreen="notes">
        <NotesPage email={user.email} />
      </AppShell>
    );
  return (
    <main className="auth-card">
      <div className="auth-card__header">
        <div className="flex items-center gap-3 mb-6">
          <span className="topbar__mark">N</span>
          <span className="text-lg font-semibold text-[var(--color-text)]">Notes</span>
        </div>
        <h1>Welcome back</h1>
        <p className="text-[var(--color-text-muted)]">Sign in to your private notes.</p>
      </div>
      <form onSubmit={submit}>
        <label className="field">
          <span className="field__label">Email</span>
          <input
            className="field__control"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="field__control"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button className="button w-full" type="submit">
          Sign in
        </button>
      </form>
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
      <p className="auth-card__footer">
        New here? <a href="/">Create an account</a>
      </p>
    </main>
  );
}
