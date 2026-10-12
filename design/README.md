# The approved design

Written by ABCD from the Design stage. **Do not edit** — it is the contract every screen is
built to match. `design.css` is loaded app-wide (`apps/web/src/styles.css`, with Tailwind).

| Screen | Approved file | Purpose |
|---|---|---|
| Sign in | `screens/sign-in.html` | where returning users enter their email and password, with a link to Sign up |
| Sign up | `screens/sign-up.html` | where new users create an account with email and password, with a link to Sign in |
| Notes | `screens/notes.html` | the main workspace for quick capture, browsing active notes, searching, filtering by one tag, pinning, and archiving |
| Note | `screens/note.html` | where a user views and edits a note, manages its comma-separated tags, saves changes, cancels, or permanently deletes it |
| Discard changes confirmation | `screens/discard-changes-confirmation.html` | asks whether to leave the Note screen and discard unsaved edits |
| Archived | `screens/archived.html` | where users review archived notes and restore or open them |
| Delete confirmation | `screens/delete-confirmation.html` | asks the user to confirm permanent deletion of a note |
