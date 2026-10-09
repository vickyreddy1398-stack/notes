import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

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
    try {
      await trpc.users.signUp({ email, password });
      setUser(await trpc.users.currentUser());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign up");
    }
  }

  if (user)
    return (
      <main>
        <h1>Notes</h1>
        <p>Signed in as {user.email}</p>
      </main>
    );
  return (
    <main>
      <h1>Sign up</h1>
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
        <button type="submit">Sign up</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
