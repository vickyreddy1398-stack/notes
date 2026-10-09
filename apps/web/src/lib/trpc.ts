type User = { id: string; email: string };

async function call<T>(path: string, input?: unknown, query = false): Promise<T> {
  const baseUrl =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
      ? "http://127.0.0.1:3001/api/trpc"
      : "/api/trpc";
  const hasInput = input !== undefined;
  const url = `${baseUrl}/${path}${query && hasInput ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ""}`;
  const response = await fetch(url, {
    method: query || !hasInput ? "GET" : "POST",
    credentials: "include",
    headers: hasInput ? { "content-type": "application/json" } : undefined,
    body: !query && hasInput ? JSON.stringify(input) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Request failed");
  return payload.result.data;
}

export const trpc = {
  users: {
    signUp: (input: { email: string; password: string }) => call<User>("users.signUp", input),
    signIn: (input: { email: string; password: string }) => call<User>("users.signIn", input),
    currentUser: () => call<User>("users.currentUser"),
  },
  notes: {
    list: (input: { tagId?: string } = {}) => call<Note[]>("notes.list", input, true),
    archived: () => call<Note[]>("notes.archived"),
    restore: (input: { id: string }) => call<Note>("notes.restore", input),
    create: (input: { title: string; body?: string }) => call<Note>("notes.create", input),
  },
  tags: {
    list: () => call<Tag[]>("tags.list"),
  },
};

type Tag = { id: string; name: string };

type Note = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};
