import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { trpc } from "../../lib/trpc";

type Props = { email: string; activeScreen: "notes" | "archived"; children: React.ReactNode };

type Tag = { id: string; name: string };

type TagsContextValue = { refreshTags: () => Promise<Tag[] | undefined> };
const TagsContext = createContext<TagsContextValue | null>(null);

export function useTagsRefresh() {
  return useContext(TagsContext)?.refreshTags ?? (async () => undefined);
}

export function AppShell({ email, activeScreen, children }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const latestTagRefresh = useRef(0);

  const refreshTags = useCallback(async () => {
    const requestId = ++latestTagRefresh.current;
    try {
      const loaded = await trpc.tags.list();
      if (requestId === latestTagRefresh.current) setTags(loaded);
      return loaded;
    } catch {
      // The existing tag list remains usable when a refresh fails.
      return undefined;
    }
  }, []);

  useEffect(() => {
    void refreshTags();
  }, [refreshTags]);

  return (
    <>
      <header className="topbar">
        <button
          className="topbar__menu button button--quiet"
          type="button"
          aria-label="Open navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          ☰
        </button>
        <a className="topbar__brand" href="/">
          <span className="topbar__mark">N</span>
          <span>Notes</span>
        </a>
        <div className="topbar__actions">
          <button className="button button--quiet" type="button" aria-label="Switch theme">
            ☼ <span className="hidden sm:inline">Theme</span>
          </button>
          <span className="topbar__user">{email}</span>
        </div>
      </header>
      <aside className={`sidebar${menuOpen ? " is-open" : ""}`}>
        <section className="sidebar__section">
          <div className="sidebar__label">Workspace</div>
          <nav className="sidebar__nav" aria-label="Workspace">
            <a
              className={`sidebar__item${activeScreen === "notes" ? " is-current" : ""}`}
              aria-current={activeScreen === "notes" ? "page" : undefined}
              href={`/${window.location.search}`}
            >
              ▤ <span>Notes</span>
            </a>
            <a
              className={`sidebar__item${activeScreen === "archived" ? " is-current" : ""}`}
              aria-current={activeScreen === "archived" ? "page" : undefined}
              href="/archived"
            >
              ▱ <span>Archived</span>
            </a>
          </nav>
        </section>
        <section className="sidebar__section">
          <div className="sidebar__label">Tags</div>
          <nav className="sidebar__nav">
            {tags.map((tag) => (
              <a className="sidebar__tag" href={`/?tag=${tag.id}`} key={tag.id}>
                {tag.name}
              </a>
            ))}
          </nav>
        </section>
      </aside>
      <TagsContext.Provider value={{ refreshTags }}>{children}</TagsContext.Provider>
    </>
  );
}
