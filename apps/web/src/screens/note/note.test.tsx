import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotePage } from "./note.page";

const response = (data: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: () =>
      Promise.resolve(ok ? { result: { data } } : { error: { message: "note not found" } }),
  });

afterEach(() => vi.restoreAllMocks());

describe("NotePage", () => {
  it("archives and restores the loaded note", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const path = String(input);
      const data = path.includes("notes.get")
        ? { id: "note-1", title: "Private title", body: "Private body", archived: false }
        : {
            id: "note-1",
            title: "Private title",
            body: "Private body",
            archived: path.includes("notes.archive"),
          };
      return response(data) as Promise<Response>;
    });
    render(<NotePage id="note-1" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("keeps archive state when archiving fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const path = String(input);
      return response(
        path.includes("notes.get")
          ? { id: "note-1", title: "Private title", body: "Private body", archived: false }
          : undefined,
        !(path.includes("notes.archive") && init?.method === "POST"),
      ) as Promise<Response>;
    });
    render(<NotePage id="note-1" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("note not found"));
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  });

  it("pins and unpins the loaded note", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, _init) => {
      const path = String(input);
      const data = path.includes("notes.get")
        ? { id: "note-1", title: "Private title", body: "Private body", pinned: false }
        : {
            id: "note-1",
            title: "Private title",
            body: "Private body",
            pinned: path.includes("notes.pin") && !path.includes("notes.unpin"),
          };
      return response(data) as Promise<Response>;
    });
    render(<NotePage id="note-1" />);
    await waitFor(() => expect(screen.getByDisplayValue("Private title")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Pin" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Unpin" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Unpin" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Pin" })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("reports a failed pin without changing the visible state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const path = String(input);
      if (path.includes("notes.pin") && init?.method === "POST") {
        return response(undefined, false) as Promise<Response>;
      }
      return response({
        id: "note-1",
        title: "Private title",
        body: "Private body",
        pinned: false,
      }) as Promise<Response>;
    });
    render(<NotePage id="note-1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Pin" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("note not found"));
    expect(screen.getByRole("button", { name: "Pin" })).toBeInTheDocument();
  });

  it("leaves immediately on clean Cancel without updating", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(
      response({
        id: "note-1",
        title: "Private title",
        body: "Private body",
      }) as Promise<Response>,
    );
    render(<NotePage id="note-1" />);
    await waitFor(() => expect(screen.getByDisplayValue("Private title")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/");
    fireEvent.click(screen.getByRole("link", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Discard changes" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks before leaving dirty title or body edits and can stay", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(
      response({
        id: "note-1",
        title: "Private title",
        body: "Private body",
      }) as Promise<Response>,
    );
    render(<NotePage id="note-1" />);
    await waitFor(() => expect(screen.getByDisplayValue("Private title")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Changed title" } });
    fireEvent.click(screen.getByRole("link", { name: "Cancel" }));
    expect(screen.getByRole("heading", { name: "Discard changes" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(screen.queryByRole("heading", { name: "Discard changes" })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Changed title")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("discards dirty edits without updating the stored note", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(
      response({
        id: "note-1",
        title: "Private title",
        body: "Private body",
      }) as Promise<Response>,
    );
    render(<NotePage id="note-1" />);
    await waitFor(() => expect(screen.getByDisplayValue("Private title")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: "Changed body" } });
    fireEvent.click(screen.getByRole("link", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("link", { name: "Discard changes" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the saved title and body as the new clean baseline", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const path = String(input);
      return response(
        path.includes("notes.update") && init?.method === "POST"
          ? { id: "note-1", title: "Saved title", body: "Saved body" }
          : { id: "note-1", title: "Private title", body: "Private body" },
      ) as Promise<Response>;
    });
    render(<NotePage id="note-1" />);
    await waitFor(() => expect(screen.getByDisplayValue("Private title")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Saved title" } });
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: "Saved body" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Changes saved"));
    fireEvent.click(screen.getByRole("link", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Discard changes" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("loads a note into editable fields with Save and Cancel", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(
      response({
        id: "note-1",
        title: "Private title",
        body: "Private body",
      }) as Promise<Response>,
    );
    render(<NotePage id="note-1" />);
    expect(screen.getByText("Loading note…")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByDisplayValue("Private title")).toBeInTheDocument());
    expect(screen.getByDisplayValue("Private body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Changed" } });
    const form = screen.getByRole("button", { name: "Save" }).closest("form");
    if (!form) throw new Error("Editor form not found");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Changes saved"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("requires confirmation and cancellation leaves the note unchanged", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(
      response({
        id: "note-1",
        title: "Private title",
        body: "Private body",
      }) as Promise<Response>,
    );
    render(<NotePage id="note-1" />);
    await waitFor(() => expect(screen.getByDisplayValue("Private title")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("heading", { name: "Delete confirmation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Delete confirmation" })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Private title")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the note available when confirmed deletion fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        response(
          init?.method === "POST"
            ? undefined
            : { id: "note-1", title: "Private title", body: "Private body" },
          init?.method !== "POST",
        ) as Promise<Response>,
    );
    render(<NotePage id="note-1" />);
    await waitFor(() => expect(screen.getByDisplayValue("Private title")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("note not found"));
    expect(screen.getByDisplayValue("Private title")).toBeInTheDocument();
  });

  it("does not render note contents when loading fails", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(response(undefined, false) as Promise<Response>);
    render(<NotePage id="not-owned" />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("note not found"));
    expect(screen.queryByText("Private title")).not.toBeInTheDocument();
    expect(screen.queryByText("Private body")).not.toBeInTheDocument();
  });
});
