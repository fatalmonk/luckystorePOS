import { Search, Bell, Moon, Sun, Menu, PanelLeftClose, User, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  sidebarHidden: boolean;
  onToggleCollapse?: () => void;
  collapsed?: boolean;
  onSearchFocus?: () => void;
  isMobile: boolean;
  hidden?: boolean;
}

export function TopHeader({
  onToggleSidebar,
  sidebarHidden,
  onToggleCollapse,
  collapsed = false,
  onSearchFocus,
  isMobile,
  hidden = false,
}: TopHeaderProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.name?.trim() || 'User';
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    return localStorage.getItem('privacy_mode') === 'true';
  });
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isBengali = i18n.language === 'bn';

  const commands = [
    { label: isBengali ? 'ড্যাশবোর্ড' : 'Dashboard', description: isBengali ? 'মূল সারসংক্ষেপ দেখুন' : 'View the main overview', path: '/' },
    { label: isBengali ? 'পণ্য তালিকা' : 'Inventory', description: isBengali ? 'পণ্য ও স্টক পরিচালনা করুন' : 'Manage products and stock', path: '/inventory' },
    { label: isBengali ? 'নতুন ক্রয়' : 'New purchase', description: isBengali ? 'ক্রয় গ্রহণ শুরু করুন' : 'Start purchase receiving', path: '/purchase' },
    { label: isBengali ? 'বিক্রয় ইতিহাস' : 'Sales history', description: isBengali ? 'সাম্প্রতিক বিক্রয় পর্যালোচনা করুন' : 'Review recent sales', path: '/sales' },
    { label: isBengali ? 'গ্রাহক লেজার' : 'Customer ledger', description: isBengali ? 'গ্রাহক স্টেটমেন্ট দেখুন' : 'View customer statements', path: '/finance/customers' },
    { label: isBengali ? 'সরবরাহকারী লেজার' : 'Supplier ledger', description: isBengali ? 'সরবরাহকারী স্টেটমেন্ট দেখুন' : 'View supplier statements', path: '/finance/suppliers' },
    { label: isBengali ? 'আদায়' : 'Collections', description: isBengali ? 'গ্রাহক পেমেন্ট পরিচালনা করুন' : 'Manage customer payments', path: '/collections' },
    { label: isBengali ? 'প্রতিবেদন' : 'Reports', description: isBengali ? 'বিক্রয় ও আর্থিক প্রতিবেদন দেখুন' : 'Review sales and financial reports', path: '/reports' },
    { label: isBengali ? 'সেটিংস' : 'Settings', description: isBengali ? 'স্টোর সেটিংস পরিচালনা করুন' : 'Manage store settings', path: '/settings' },
  ];

  const filteredCommands = commands.filter((command) => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return !normalizedQuery || `${command.label} ${command.description}`.toLocaleLowerCase().includes(normalizedQuery);
  });

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
    setActiveCommandIndex(0);
    onSearchFocus?.();
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [onSearchFocus]);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setActiveCommandIndex(0);
    setSearchQuery('');
  }, []);

  const closeHelp = useCallback(() => setIsHelpOpen(false), []);

  const runCommand = (path: string) => {
    closeCommandPalette();
    navigate(path);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const togglePrivacy = () => {
    setIsPrivacyMode(!isPrivacyMode);
  };

  const toggleLanguage = () => {
    const next = i18n.language === 'bn' ? 'en' : 'bn';
    i18n.changeLanguage(next);
  };

  // Global Keyboard shortcuts: Cmd/Ctrl+K (command palette), ? (help/shortcuts guide), / (focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputActive = target?.isContentEditable || !!target?.closest(
        'input, textarea, select, button, [role="button"], [role="checkbox"], [role="combobox"], [contenteditable="true"], [role="dialog"][aria-modal="true"]'
      );

      // Keep the help dialog as the sole active modal until it closes.
      if (isHelpOpen) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey && !isInputActive) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey && !isInputActive) {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        closeCommandPalette();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeCommandPalette, isCommandPaletteOpen, isHelpOpen, openCommandPalette]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (isPrivacyMode) {
      document.documentElement.setAttribute('data-privacy', 'true');
    } else {
      document.documentElement.removeAttribute('data-privacy');
    }
    localStorage.setItem('privacy_mode', isPrivacyMode ? 'true' : 'false');
  }, [isPrivacyMode]);

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isCommandPaletteOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveCommandIndex((current) => Math.min(current + 1, filteredCommands.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveCommandIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && filteredCommands[activeCommandIndex]) {
      event.preventDefault();
      runCommand(filteredCommands[activeCommandIndex].path);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeCommandPalette();
    }
  };

  return (
    <header className={`top-header ${hidden ? 'header--hidden' : ''}`} aria-hidden={hidden ? 'true' : undefined}>
      <div className="header-left">
        {(isMobile || sidebarHidden) && (
          <button 
            className="header-button" 
            onClick={onToggleSidebar} 
            title={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
            aria-label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarHidden ? <Menu size={20} /> : <PanelLeftClose size={20} />}
          </button>
        )}
      </div>

      <div className="header-center">
        <div className="search-container">
          <Search className="search-icon" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={isBengali ? 'খুঁজুন বা একটি কাজ নির্বাচন করুন... (⌘K)' : 'Search or choose an action... (⌘K)'}
            value={searchQuery}
            onFocus={openCommandPalette}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveCommandIndex(0);
              setIsCommandPaletteOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            className="search-input"
            aria-label="Global search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isCommandPaletteOpen}
            aria-controls="global-command-list"
            aria-activedescendant={isCommandPaletteOpen && filteredCommands[activeCommandIndex] ? `global-command-${activeCommandIndex}` : undefined}
          />
          <div className="search-shortcut" aria-hidden="true">
            <span>⌘</span>
            <span>K</span>
          </div>
          {isCommandPaletteOpen && createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20"
              onClick={closeCommandPalette}
            >
              <div
                className="w-full max-w-2xl max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-border-default bg-surface p-2 shadow-level-3"
                role="dialog"
                aria-modal="true"
                aria-label={isBengali ? 'দ্রুত কাজ' : 'Quick actions'}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    // Keep focus constrained inside command palette
                    e.preventDefault();
                    searchInputRef.current?.focus();
                  }
                }}
              >
                <p className="px-3 py-2 text-label-sm text-text-muted">
                  {isBengali ? 'দ্রুত কাজ' : 'Quick actions'}
                </p>
                <div id="global-command-list" role="listbox" aria-label={isBengali ? 'কমান্ড ফলাফল' : 'Command results'}>
                  {filteredCommands.length > 0 ? filteredCommands.map((command, index) => (
                    <button
                      id={`global-command-${index}`}
                      key={command.path}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={index === activeCommandIndex}
                      className={`flex min-h-11 w-full flex-col rounded-md px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-primary ${index === activeCommandIndex ? 'bg-background-subtle' : 'hover:bg-background-subtle'}`}
                      onMouseEnter={() => setActiveCommandIndex(index)}
                      onClick={() => runCommand(command.path)}
                    >
                      <span className="text-label-lg text-text-primary">{command.label}</span>
                      <span className="text-body-sm text-text-muted">{command.description}</span>
                    </button>
                  )) : (
                    <p className="px-3 py-6 text-center text-body-sm text-text-muted">
                      {isBengali ? 'কোনো কাজ পাওয়া যায়নি।' : 'No matching actions found.'}
                    </p>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )}
        </div>
      </div>

      <div className="header-right">
        <button
          className="header-button"
          onClick={toggleLanguage}
          aria-label={`Language, ${i18n.language === 'bn' ? 'বাংলা' : 'EN'}`}
          type="button"
        >
          <span className="sr-only">Language</span>
          <span className="text-sm font-bold">{i18n.language === 'bn' ? 'বাংলা' : 'EN'}</span>
        </button>

        <button className="header-button" aria-label="View notifications" type="button">
          <span className="sr-only">Notifications</span>
          <Bell size={16} />
        </button>
        <button
          className="header-button"
          onClick={() => setIsHelpOpen(true)}
          aria-label={isBengali ? 'কীবোর্ড শর্টকাট ও সাহায্য' : 'Keyboard shortcuts & help'}
          title={isBengali ? 'কীবোর্ড শর্টকাট (?)' : 'Keyboard shortcuts (?)'}
          type="button"
        >
          <span className="sr-only">Help & Shortcuts</span>
          <HelpCircle size={16} />
        </button>
        <button
          className="header-button"
          onClick={togglePrivacy}
          aria-label={isPrivacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
          title={isPrivacyMode ? (isBengali ? 'প্রাইভেসি মোড বন্ধ করুন' : 'Disable privacy mode') : (isBengali ? 'প্রাইভেসি মোড চালু করুন' : 'Enable privacy mode')}
          type="button"
        >
          <span className="sr-only">Toggle privacy mode</span>
          {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button className="header-button" onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} type="button">
          <span className="sr-only">Toggle theme</span>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="user-profile" role="group" aria-label="User menu">
          <div className="avatar" aria-hidden="true"><User size={16} /></div>
          <span className="user-name">{userName}</span>
        </div>
      </div>

      <KeyboardShortcutsModal
        isOpen={isHelpOpen}
        onClose={closeHelp}
      />
    </header>
  );
}

/* Add to src/styles/components.css */
/*
.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  height: 64px;
  background-color: var(--bg-header);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.header-center {
  flex: 1;
  max-width: 600px;
  margin: 0 var(--space-6);
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) 36px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--bg-input);
  color: var(--text-main);
}

.search-shortcut {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  font-size: var(--font-size-xs);
}

.header-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background-color: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.header-button:hover {
  background-color: var(--bg-sidebar-hover);
  color: var(--text-main);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.user-name {
  font-weight: 600;
  color: var(--text-main);
}
*/
