import { render, screen } from "@testing-library/react";
import { SignInPage } from "./screens/sign-in/sign-in.page";

it("renders the sign-in screen", () => {
  render(<SignInPage />);
  expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
});
