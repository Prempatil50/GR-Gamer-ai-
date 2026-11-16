import { useMemo, useRef, useState } from 'react';
import {
  Check,
  Compass,
  LogOut,
  MessageSquare,
  Palette,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
  Youtube,
} from 'lucide-react';
import { CATEGORY_LABELS, type ChatPage, type UserProfile } from '../lib/opportunities';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  user: UserProfile;
  pages: ChatPage[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onCreateNewPage: () => void;
  onOpenOpportunities: () => void;
  onRenamePage: (pageId: string, newTitle: string) => Promise<void>;
  onTogglePinPage: (pageId: string, pinned: boolean) => Promise<void>;
  onDeletePage: (pageId: string) => Promise<void>;
  onOpenAppearance: () => void;
  onOpenYouTube: () => void;
  connectedYouTubeCount: number;
  primaryChannelLabel?: string;
  onSignOut: () => Promise<void>;
}

export function Sidebar({
  isOpen,
  onCloseMobile,
  user,
  pages,
  activePageId,
  onSelectPage,
  onCreateNewPage,
  onOpenOpportunities,
  onRenamePage,
  onTogglePinPage,
  onDeletePage,
  onOpenAppearance,
  onOpenYouTube,
  connectedYouTubeCount,
  primaryChannelLabel,
  onSignOut,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        CATEGORY_LABELS[p.category]?.toLowerCase().includes(q)
    );
  }, [pages, searchQuery]);

  const pinnedPages = filteredPages.filter((p) => p.pinned);
  const regularPages = filteredPages.filter((p) => !p.pinned);

  const startRename = (page: ChatPage) => {
    setEditingPageId(page.id);
    setEditingTitle(page.title);
  };

  const submitRename = async (pageId: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      await onRenamePage(pageId, trimmed);
    }
    setEditingPageId(null);
  };

  const initials = (user.displayName || user.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;
    if (deltaX < -64) {
      onCloseMobile();
    }
  };

  const renderPageRow = (page: ChatPage) => {
    const isActive = page.id === activePageId;
    const isEditing = editingPageId === page.id;

    return (
      <div
        key={page.id}
        className="group relative flex items-center gap-2 rounded-xl md:rounded-lg px-2.5 py-2 transition-colors min-h-[52px] md:min-h-0"
        style={{
          backgroundColor: isActive ? 'var(--surface-elevated)' : 'transparent',
          border: isActive
            ? '1px solid var(--surface-border)'
            : '1px solid transparent',
        }}
      >
        {isEditing ? (
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="text"
              value={editingTitle}
              maxLength={140}
              autoFocus
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitRename(page.id);
                if (e.key === 'Escape') setEditingPageId(null);
              }}
              className="flex-1 min-w-0 text-base md:text-xs px-2.5 py-2 md:py-1 rounded-lg border outline-none"
              style={{
                backgroundColor: 'var(--canvas-bg)',
                borderColor: 'var(--accent-primary)',
              }}
            />
            <button
              onClick={() => void submitRename(page.id)}
              aria-label="Save title"
              className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-1 flex items-center justify-center rounded-lg hover:opacity-80 cursor-pointer"
            >
              <Check className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
            <button
              onClick={() => setEditingPageId(null)}
              aria-label="Cancel rename"
              className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-1 flex items-center justify-center rounded-lg hover:opacity-80 cursor-pointer"
            >
              <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => {
                onSelectPage(page.id);
                onCloseMobile();
              }}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer py-0.5"
            >
              <MessageSquare
                className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0"
                style={{
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{page.title}</div>
                <div
                  className="text-[11px] truncate tabular-nums"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {CATEGORY_LABELS[page.category]} · {page.messageCount} msgs
                </div>
              </div>
            </button>

            <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => void onTogglePinPage(page.id, !page.pinned)}
                title={page.pinned ? 'Unpin page' : 'Pin page'}
                aria-label={page.pinned ? 'Unpin page' : 'Pin page'}
                className="min-h-[40px] min-w-[36px] md:min-h-0 md:min-w-0 md:p-1 flex items-center justify-center rounded-lg hover:opacity-80 cursor-pointer"
                style={{
                  color: page.pinned
                    ? 'var(--accent-primary)'
                    : 'var(--text-muted)',
                }}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => startRename(page)}
                title="Rename page"
                aria-label="Rename page"
                className="min-h-[40px] min-w-[36px] md:min-h-0 md:min-w-0 md:p-1 flex items-center justify-center rounded-lg hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => void onDeletePage(page.id)}
                title="Delete page"
                aria-label="Delete page"
                className="min-h-[40px] min-w-[36px] md:min-h-0 md:min-w-0 md:p-1 flex items-center justify-center rounded-lg hover:text-red-500 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] transition-opacity duration-200 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
        onClick={onCloseMobile}
      />
      <aside
        aria-hidden={!isOpen}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed md:static inset-y-0 left-0 z-40 w-[86vw] max-w-[320px] md:w-[272px] shrink-0 flex flex-col border-r h-[100dvh] md:h-full transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] pt-safe ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
        style={{
          backgroundColor: 'var(--surface-bg)',
          borderColor: 'var(--surface-border)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="p-4 space-y-3 border-b" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold tracking-tight whitespace-nowrap">
              Aurora AI
            </span>
            <button
              onClick={onCloseMobile}
              aria-label="Close sidebar"
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl cursor-pointer hover:opacity-80"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onCreateNewPage();
                onCloseMobile();
              }}
              className="min-h-[44px] md:min-h-0 flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-2 rounded-xl md:rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-fg)',
              }}
            >
              <Plus className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
              <span>New Page</span>
            </button>

            <button
              onClick={() => {
                onOpenOpportunities();
                onCloseMobile();
              }}
              className="min-h-[44px] md:min-h-0 flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-2 rounded-xl md:rounded-lg text-xs font-medium border cursor-pointer transition-opacity hover:opacity-80 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--surface-border)',
              }}
            >
              <Compass className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
              <span>Opportunities</span>
            </button>
          </div>

          <div
            className="min-h-[44px] md:min-h-0 flex items-center gap-2 px-3 md:px-2.5 py-2 md:py-1.5 rounded-xl md:rounded-lg border"
            style={{
              backgroundColor: 'var(--canvas-bg)',
              borderColor: 'var(--surface-border)',
            }}
          >
            <Search className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="w-full bg-transparent text-base md:text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5 overscroll-contain">
          {pages.length === 0 ? (
            <div className="px-2 py-8 text-center space-y-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No pages yet. Start a conversation or pick an Opportunity mode.
              </p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No matching pages found.
            </div>
          ) : (
            <>
              {pinnedPages.length > 0 && (
                <div className="space-y-1">
                  <div
                    className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Pinned
                  </div>
                  {pinnedPages.map(renderPageRow)}
                </div>
              )}

              {regularPages.length > 0 && (
                <div className="space-y-1">
                  <div
                    className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Pages
                  </div>
                  {regularPages.map(renderPageRow)}
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="p-3 pb-safe border-t space-y-2"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          <button
            onClick={() => {
              onOpenYouTube();
              onCloseMobile();
            }}
            className="w-full min-h-[44px] md:min-h-0 flex items-center justify-between gap-2 px-3 md:px-2.5 py-2.5 md:py-2 rounded-xl md:rounded-lg text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Youtube className="w-4 h-4 shrink-0 text-red-500" />
              <span className="truncate">
                {primaryChannelLabel
                  ? primaryChannelLabel
                  : 'Connect YouTube Channel'}
              </span>
            </div>
            {connectedYouTubeCount > 0 && (
              <span
                className="text-[11px] tabular-nums shrink-0"
                style={{ color: 'var(--text-muted)' }}
              >
                {connectedYouTubeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              onOpenAppearance();
              onCloseMobile();
            }}
            className="w-full min-h-[44px] md:min-h-0 flex items-center gap-2.5 px-3 md:px-2.5 py-2.5 md:py-2 rounded-xl md:rounded-lg text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <Palette className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-primary)' }} />
            <span>Language, Voice & Theme</span>
          </button>

          <div className="flex items-center justify-between gap-2 px-1.5 pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL && !avatarFailed ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User avatar'}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-9 h-9 md:w-8 md:h-8 rounded-full object-cover shrink-0 border"
                  style={{ borderColor: 'var(--surface-border)' }}
                />
              ) : (
                <div
                  className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-fg)',
                  }}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">
                  {user.displayName || 'Google User'}
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {user.email}
                </div>
              </div>
            </div>

            <button
              onClick={() => void onSignOut()}
              title="Sign out"
              aria-label="Sign out"
              className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-2 flex items-center justify-center rounded-xl md:rounded-lg hover:opacity-75 cursor-pointer shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
