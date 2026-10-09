import { NotePage } from "./screens/note/note.page";
import { SignInPage } from "./screens/sign-in/sign-in.page";
import { SignUpPage } from "./screens/sign-up/sign-up.page";

export function App() {
  const noteMatch = window.location.pathname.match(/^\/notes\/([^/]+)$/);
  if (noteMatch) return <NotePage id={decodeURIComponent(noteMatch[1])} />;
  return window.location.pathname === "/sign-in" ? <SignInPage /> : <SignUpPage />;
}
