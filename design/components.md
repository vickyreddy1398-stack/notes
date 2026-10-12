## App shell — `.topbar` and `.sidebar`
Use on every signed-in screen to provide the shared header, theme control, user identity, desktop navigation, tag list, and mobile menu.
`<header class="topbar"><button class="topbar__menu button button--quiet">☰</button><a class="topbar__brand" href="#"><span class="topbar__mark">N</span>Notes</a><div class="topbar__actions"><button class="button button--quiet">Theme</button><span class="topbar__user">you@example.com</span></div></header><aside class="sidebar"><nav class="sidebar__nav"><a class="sidebar__item is-current" aria-current="page" href="#">Notes</a><a class="sidebar__item" href="#">Archived</a></nav><section class="sidebar__section"><div class="sidebar__label">Tags</div><div class="sidebar__nav"><a class="sidebar__tag" href="#">ideas</a></div></section></aside>`

## Auth card — `.auth-card`
Use for the focused Sign in and Sign up screens.
`<main class="auth-card"><div class="auth-card__header"><h1>Welcome back</h1><p>Sign in to your private notes.</p></div><form>…fields and <button class="button">Sign in</button>…</form><p class="auth-card__footer">New here? <a href="#">Create an account</a></p></main>`

## Form field — `.field`, `.field__label`, `.field__control`, `.field__hint`, `.field__error`
Use for consistent email, password, title, body, and comma-separated tag inputs.
`<label class="field"><span class="field__label">Email</span><input class="field__control" type="email" placeholder="you@example.com"><span class="field__hint">Use the email for your seven-day session.</span></label>`

## Button — `.button` and modifiers
Use for primary actions, quiet icon actions, secondary cancellation, and destructive actions.
`<div class="flex gap-2"><button class="button">Save</button><button class="button button--secondary">Cancel</button><button class="button button--danger">Delete permanently</button></div>`

## Workspace toolbar — `.workspace-toolbar`, `.workspace-toolbar__search`, `.workspace-toolbar__filters`
Use above the active notes list for search and the single-tag filter.
`<div class="workspace-toolbar"><input class="field__control workspace-toolbar__search" placeholder="Search notes"><div class="workspace-toolbar__filters"><button class="tag tag--filter is-selected">All notes</button><button class="tag tag--filter">ideas</button></div></div>`

## Quick capture — `.quick-capture`
Use at the top of the Notes screen for fast explicit note creation.
`<form class="quick-capture"><div class="quick-capture__row"><input class="quick-capture__title" required maxlength="200" placeholder="Write a note title…"></div><textarea class="quick-capture__body" maxlength="50000" placeholder="Add a thought, if you like"></textarea><div class="quick-capture__actions"><input class="field__control" placeholder="tags, comma-separated"><button class="button">Save note</button></div></form>`

## Tag — `.tag` and `.tag--filter`
Use for saved note tags and selectable single-tag filters.
`<div class="flex gap-2"><span class="tag">ideas</span><button class="tag tag--filter is-selected">work</button></div>`

## Note list — `.note-list`
Use for active and archived note collections; it owns vertical overflow.
`<section class="note-list"><article class="note-row">…</article><article class="note-row">…</article></section>`

## Note row — `.note-row` and descendants
Use for the quiet reusable record presentation in Notes and Archived, including pin, archive, restore, and open actions.
`<article class="note-row"><div class="note-row__content"><h2 class="note-row__title">A note title</h2><p class="note-row__preview">A short plain-text preview of the note body.</p><div class="note-row__meta"><span class="tag">ideas</span><time>Updated today</time></div></div><div class="note-row__actions"><button class="button button--quiet">Pin</button><a class="button button--secondary" href="#">Open</a></div></article>`

## Note editor — `.note-editor`
Use on the dedicated Note screen for explicit Save, Cancel, tag management, and permanent deletion.
`<main class="note-editor"><div class="note-editor__header"><div><h1>Edit note</h1><p>Changes are saved explicitly.</p></div><div class="note-editor__actions"><button class="button button--secondary">Cancel</button><button class="button">Save</button></div></div><form><label class="field"><span class="field__label">Title</span><input class="field__control" required maxlength="200"></label><label class="field"><span class="field__label">Body</span><textarea class="field__control field__control--body" maxlength="50000"></textarea></label><label class="field"><span class="field__label">Tags</span><input class="field__control" placeholder="ideas, planning"></label></form><div class="note-editor__footer"><time>Updated today</time><button class="button button--danger">Delete permanently</button></div></main>`

## Empty state — `.empty-state`
Use when Notes or Archived has no records, with a short creation or organization hint.
`<section class="empty-state"><div class="empty-state__icon">✦</div><h2>No notes yet</h2><p class="empty-state__hint">Capture your first thought above and it will appear here.</p></section>`

## Confirmation modal — `.modal`, `.modal__dialog`, `.modal__actions`
Use for discard-changes and permanent-delete confirmation steps.
`<div class="modal" role="dialog" aria-modal="true"><section class="modal__dialog"><h2>Discard changes?</h2><p>Your unsaved edits will be lost.</p><div class="modal__actions"><button class="button button--secondary">Keep editing</button><button class="button button--danger">Discard</button></div></section></div>`