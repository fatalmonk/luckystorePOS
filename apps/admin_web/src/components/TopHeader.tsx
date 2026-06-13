import { Search, Bell, Moon, Sun, Menu, PanelLeftClose, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  sidebarHidden: boolean;
  onToggleCollapse?: () => void;
  collapsed?: boolean;
  onSearchFocus?: () => void;
  isMobile: boolean;
}

export function TopHeader({ onToggleSidebar, sidebarHidden, onToggleCollapse, collapsed = false, onSearchFocus, isMobile }: TopHeaderProps) {
  const { i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleLanguage = () => {
    const next = i18n.language === 'bn' ? 'en' : 'bn';
    i18n.changeLanguage(next);
  };

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        onSearchFocus?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearchFocus]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <header className="top-header">
      <div className="header-left">
        {!sidebarHidden && !isMobile && onToggleCollapse && (
          <button 
            className="header-button" 
            onClick={onToggleCollapse} 
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftClose size={20} /> : <Menu size={20} />}
          </button>
        )}
        <button 
          className="header-button" 
          onClick={onToggleSidebar} 
          title={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
          aria-label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
        >
          {sidebarHidden ? <Menu size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <div className="header-center">
        <div className="search-container">
          <Search className="search-icon" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search or create anything... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Global search"
            role="searchbox"
          />
          <div className="search-shortcut" aria-hidden="true">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button className="header-button" onClick={toggleLanguage} aria-label="Change language" type="button">
          <span className="sr-only">Language</span>
          <span className="text-sm font-bold">{i18n.language === 'bn' ? 'বাংলা' : 'EN'}</span>
        </button>

        <button className="header-button" aria-label="View notifications" type="button">
          <span className="sr-only">Notifications</span>
          <Bell size={16} />
        </button>
        <button className="header-button" onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} type="button">
          <span className="sr-only">Toggle theme</span>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="user-profile" role="group" aria-label="User menu">
          <div className="avatar" aria-hidden="true"><User size={16} /></div>
          <span className="user-name">Mohammed</span>
        </div>
      </div>
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
