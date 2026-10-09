import { type FormEvent, useState } from "react";
import { trpc } from "../../lib/trpc";

export function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await trpc.users.signUp.mutate({ email, password });
      setMessage(`Welcome, ${result.user.email}! Your account is ready.`);
    } catch {
      setMessage("Could not create account. Please check your details and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <h1>Sign up</h1>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Sign up"}
        </button>
      </form>
      {message && <p role="status">{message}</p>}
    </main>
  );
}
