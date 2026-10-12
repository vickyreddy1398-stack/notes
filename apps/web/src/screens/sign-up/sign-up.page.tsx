import { useEffect, useState } from "react";
import { signUpInput } from "../../../../api/src/modules/users/users.types";
import { AppShell } from "../../components/app-shell/app-shell";
import { trpc } from "../../lib/trpc";
import { NotesPage } from "../notes/notes.page";

type User = { email: string };

export function SignUpPage() {
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
    const parsed = signUpInput.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email or password");
      return;
    }
    try {
      await trpc.users.signUp(parsed.data);
      setUser(await trpc.users.currentUser());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign up");
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
          <span className="topbar__mark" aria-hidden="true">
            N
          </span>
          <span className="font-semibold text-[var(--color-text)]">Notes</span>
        </div>
        <h1>Create your account</h1>
        <p>Start capturing private notes in seconds.</p>
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
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <span className="field__hint">Your account keeps your notes private to you.</span>
        </label>
        <button className="button w-full" type="submit">
          Create account
        </button>
      </form>
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
      <p className="auth-card__footer">
        Already have an account? <a href="/sign-in">Sign in</a>
      </p>
    </main>
  );
}
