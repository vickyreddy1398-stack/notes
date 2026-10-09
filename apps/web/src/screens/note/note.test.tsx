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

  it("does not render note contents when loading fails", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(response(undefined, false) as Promise<Response>);
    render(<NotePage id="not-owned" />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("note not found"));
    expect(screen.queryByText("Private title")).not.toBeInTheDocument();
    expect(screen.queryByText("Private body")).not.toBeInTheDocument();
  });
});
