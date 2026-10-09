# Issue #22 release evidence

## Pre-release manual verification

Completed against the Notes screen with Chromium after the active-list filtering change:

- [x] A case-insensitive title/body search reaches matching active owner notes.
- [x] Selecting one used tag reaches only active notes attached to that tag.
- [x] Search and tag modes are mutually exclusive; changing mode clears the other mode.
- [x] Unfiltered, search, and tag results retain pinned/updated/created/id ordering.
- [x] Archived and another user's notes are not shown in the active list.
- [x] Unused and archived-only tags are absent from the tag selector.
- [x] The fixture's every non-archived owner note is reachable through the unfiltered list,
      search, or its single tag.

Automated browser evidence: `apps/web/tests/notes.browser.test.ts` (Chromium, Playwright 1.63.0).
API evidence: `apps/api/src/modules/notes/notes.test.ts` and
`apps/api/src/modules/tags/tags.test.ts`.
