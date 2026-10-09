import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotesPage } from "./notes.page";

const response = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ result: { data } }) });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function noteForm() {
  const form = screen.getByRole("button", { name: "Save note" }).closest("form");
  if (!form) throw new Error("Note form not found");
  return form;
}

afterEach(() => vi.restoreAllMocks());

describe("NotesPage", () => {
  it("shows the quick-entry controls and validates note content", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(response([]) as Promise<Response>);
    render(<NotesPage email="person@example.com" />);
    await waitFor(() =>
      expect(screen.getByText("Create your first note to get started.")).toBeInTheDocument(),
    );

    fireEvent.submit(noteForm());
    expect(screen.getByRole("alert")).toHaveTextContent("Title is required");
  });

  it("keeps a saved note when the initial list response arrives late", async () => {
    const saved = {
      id: "note-race",
      title: "Saved during loading",
      body: null,
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    };
    const initial = deferred<Awaited<ReturnType<typeof response>>>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      const call = fetchMock.mock.calls.length;
      if (call === 1) return initial.promise as Promise<Response>;
      if (call === 2) return response([]) as Promise<Response>;
      if (call === 3) return response(saved) as Promise<Response>;
      return response([saved]) as Promise<Response>;
    });

    render(<NotesPage email="person@example.com" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: saved.title } });
    fireEvent.submit(noteForm());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Note saved"));

    initial.resolve(await response([]));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: saved.title })).toBeInTheDocument(),
    );
  });

  it("shows the create-first-note hint for an empty search result", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(response([]) as Promise<Response>)
      .mockReturnValueOnce(response([]) as Promise<Response>)
      .mockReturnValueOnce(response([]) as Promise<Response>);
    render(<NotesPage email="person@example.com" />);
    await waitFor(() =>
      expect(screen.getByText("Create your first note to get started.")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Search notes"), { target: { value: "missing" } });
    const searchForm = screen.getByRole("button", { name: "Search" }).closest("form");
    if (!searchForm) throw new Error("Search form not found");
    fireEvent.submit(searchForm);
    await waitFor(() =>
      expect(screen.getByText("Create your first note to get started.")).toBeInTheDocument(),
    );
    expect(fetchMock.mock.calls[2]?.[0]).toContain(
      encodeURIComponent(JSON.stringify({ search: "missing" })),
    );
  });

  it("shows the create-first-note hint for an empty tag result", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(response([]) as Promise<Response>)
      .mockReturnValueOnce(response([{ id: "tag-1", name: "Work" }]) as Promise<Response>)
      .mockReturnValueOnce(response([]) as Promise<Response>);
    render(<NotesPage email="person@example.com" />);
    await waitFor(() =>
      expect(screen.getByText("Create your first note to get started.")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Filter by tag"), { target: { value: "tag-1" } });
    await waitFor(() =>
      expect(screen.getByText("Create your first note to get started.")).toBeInTheDocument(),
    );
    expect(fetchMock.mock.calls[2]?.[0]).toContain(
      encodeURIComponent(JSON.stringify({ tagId: "tag-1" })),
    );
  });

  it("submits a search and renders the filtered active notes", async () => {
    const matching = {
      id: "matching",
      title: "Planning",
      body: "Searchable body",
      pinned: false,
      archived: false,
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(response([]) as Promise<Response>)
      .mockReturnValueOnce(response([]) as Promise<Response>)
      .mockReturnValueOnce(response([matching]) as Promise<Response>);
    render(<NotesPage email="person@example.com" />);
    await waitFor(() =>
      expect(screen.getByText("Create your first note to get started.")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Search notes"), { target: { value: "plan" } });
    const searchForm = screen.getByRole("button", { name: "Search" }).closest("form");
    if (!searchForm) throw new Error("Search form not found");
    fireEvent.submit(searchForm);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Planning" })).toBeInTheDocument(),
    );
    expect(fetchMock.mock.calls[2]?.[0]).toContain(
      encodeURIComponent(JSON.stringify({ search: "plan" })),
    );
  });

  it("reloads and renders the saved note after explicit Save", async () => {
    const saved = {
      id: "note-1",
      title: "Saved title",
      body: "Literal body",
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(response([]) as Promise<Response>)
      .mockReturnValueOnce(response([]) as Promise<Response>)
      .mockReturnValueOnce(response(saved) as Promise<Response>)
      .mockReturnValueOnce(response([saved]) as Promise<Response>);
    render(<NotesPage email="person@example.com" />);
    await waitFor(() =>
      expect(screen.getByText("Create your first note to get started.")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: saved.title } });
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: saved.body } });
    fireEvent.submit(noteForm());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Note saved"));
    expect(screen.getByRole("heading", { name: saved.title })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
