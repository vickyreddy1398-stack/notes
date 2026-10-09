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
  it("loads a note into editable fields with Save and Cancel", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      response({ id: "note-1", title: "Private title", body: "Private body" }) as Promise<Response>,
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
    fireEvent.submit(form);
    expect(screen.getByRole("status")).toHaveTextContent("ready to save");
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
