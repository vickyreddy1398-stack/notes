import { SignInPage } from "./screens/sign-in/sign-in.page";
import { SignUpPage } from "./screens/sign-up/sign-up.page";

export function App() {
  return window.location.pathname === "/sign-in" ? <SignInPage /> : <SignUpPage />;
}
