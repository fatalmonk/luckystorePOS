import { Search, Command, Bell, Moon } from 'lucide-react';
import { useState } from 'react';

export function TopHeader() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="header-button">
          <span className="sr-only">Menu</span>
        </button>
      </div>

      <div className="header-center">
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search or create anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="search-shortcut">
            <Command size={14} />
            <span>K</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button className="header-button">
          <span className="sr-only">Language</span>
          🇺🇸
        </button>
        <button className="header-button">
          <span className="sr-only">Keyboard shortcuts</span>
          <Command size={16} />
        </button>
        <button className="header-button">
          <span className="sr-only">Notifications</span>
          <Bell size={16} />
        </button>
        <button className="header-button">
          <span className="sr-only">Dark mode</span>
          <Moon size={16} />
        </button>
        <div className="user-profile">
          <div className="avatar">M</div>
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
