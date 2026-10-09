import { useEffect, useState } from "react";
import { signInInput } from "../../../../api/src/modules/users/users.types";
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

  if (user) return <NotesPage email={user.email} />;
  return (
    <main>
      <h1>Sign in</h1>
      <h2>Notes</h2>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit">Sign in</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p>
        <a href="/">Create an account</a>
      </p>
    </main>
  );
}
