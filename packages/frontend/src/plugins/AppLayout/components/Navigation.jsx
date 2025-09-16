/**
 * File Path: src/plugins/AppLayout/components/Navigation.jsx
 * Version: 1.0.0
 * Description: Main navigation component that displays navigation items,
 *              handles active states, and provides navigation functionality.
 *              Supports both expanded and collapsed states.
 * 
 * How to Use:
 * 1. Rendered within Sidebar component
 * 2. Receives props from parent Sidebar component
 * 3. Handles navigation item clicks and active states
 * 4. Supports collapsed/expanded states
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with navigation items and active states
 */

import React, { useState, useEffect } from 'react';
import { useLayoutContext } from '../AppLayout.jsx';

// ================================================
// NAVIGATION COMPONENT
// ================================================

const Navigation = ({
  collapsed,
  isMobile,
  theme,
  onError,
  className = '',
  style = {}
}) => {
  // ================================================
  // STATE MANAGEMENT
  // ================================================

  const [activeItem, setActiveItem] = useState('');
  const [navigationItems, setNavigationItems] = useState([]);
  const [recentItems, setRecentItems] = useState([]);

  // Get layout context
  const layoutContext = useLayoutContext();

  // ================================================
  // EFFECTS
  // ================================================

  useEffect(() => {
    // Initialize navigation items
    setNavigationItems([
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: '📊',
        href: '/',
        badge: null,
        category: 'main'
      },
      {
        id: 'projects',
        label: 'Projects',
        icon: '📁',
        href: '/projects',
        badge: '3',
        category: 'main'
      },
      {
        id: 'tasks',
        label: 'Tasks',
        icon: '✅',
        href: '/tasks',
        badge: '12',
        category: 'main'
      },
      {
        id: 'calendar',
        label: 'Calendar',
        icon: '📅',
        href: '/calendar',
        badge: null,
        category: 'main'
      },
      {
        id: 'messages',
        label: 'Messages',
        icon: '💬',
        href: '/messages',
        badge: '5',
        category: 'main'
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: '📈',
        href: '/analytics',
        badge: 'new',
        category: 'tools'
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: '📋',
        href: '/reports',
        badge: null,
        category: 'tools'
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: '⚙️',
        href: '/settings',
        badge: null,
        category: 'admin'
      }
    ]);

    // Set recent items
    setRecentItems([
      { id: 'project-alpha', label: 'Project Alpha', href: '/projects/alpha' },
      { id: 'project-beta', label: 'Project Beta', href: '/projects/beta' },
      { id: 'meeting-notes', label: 'Meeting Notes', href: '/documents/meeting-notes' }
    ]);

    // Set initial active item based on current route
    const currentPath = window.location.pathname;
    const activeNavItem = navigationItems.find(item => 
      item.href === currentPath || currentPath.startsWith(item.href + '/')
    );
    if (activeNavItem) {
      setActiveItem(activeNavItem.id);
    }
  }, []);

  // Update active item when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      const currentPath = window.location.pathname;
      const activeNavItem = navigationItems.find(item => 
        item.href === currentPath || currentPath.startsWith(item.href + '/')
      );
      if (activeNavItem) {
        setActiveItem(activeNavItem.id);
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [navigationItems]);

  // ================================================
  // EVENT HANDLERS
  // ================================================

  const handleNavigationClick = (itemId, itemHref, itemLabel) => {
    try {
      setActiveItem(itemId);
      
      // Add to recent items if not already there
      if (!recentItems.some(item => item.id === itemId)) {
        setRecentItems(prev => [
          { id: itemId, label: itemLabel, href: itemHref },
          ...prev.slice(0, 2) // Keep only 3 recent items
        ]);
      }

      layoutContext.pluginContext?.emit('navigation:item:clicked', {
        itemId,
        itemHref,
        itemLabel,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      onError?.(error, 'navigation-item-click');
    }
  };

  const handleRecentItemClick = (itemId, itemHref, itemLabel) => {
    try {
      layoutContext.pluginContext?.emit('navigation:recent:clicked', {
        itemId,
        itemHref,
        itemLabel,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      onError?.(error, 'navigation-recent-click');
    }
  };

  // ================================================
  // RENDER HELPERS
  // ================================================

  const renderNavigationItem = (item) => (
    <li key={item.id} className="navigation__item">
      <a
        href={item.href}
        className={`navigation__link ${activeItem === item.id ? 'navigation__link--active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          handleNavigationClick(item.id, item.href, item.label);
          // In a real app, you would use a router here
          window.history.pushState({}, '', item.href);
        }}
        aria-current={activeItem === item.id ? 'page' : undefined}
        title={item.label}
      >
        <span className="navigation__icon" aria-hidden="true">
          {item.icon}
        </span>
        
        {!collapsed && (
          <span className="navigation__label">
            {item.label}
          </span>
        )}

        {item.badge && !collapsed && (
          <span className="navigation__badge">
            {item.badge}
          </span>
        )}

        {item.badge && collapsed && (
          <span className="navigation__badge--collapsed">
            {item.badge}
          </span>
        )}
      </a>
    </li>
  );

  const renderCategory = (category, items, title) => (
    <div className="navigation__category">
      {!collapsed && title && (
        <h3 className="navigation__category-title">
          {title}
        </h3>
      )}
      <ul className="navigation__list">
        {items.map(renderNavigationItem)}
      </ul>
    </div>
  );

  const renderRecentItems = () => (
    <div className="navigation__recent">
      {!collapsed && (
        <h3 className="navigation__recent-title">
          Recent
        </h3>
      )}
      <ul className="navigation__recent-list">
        {recentItems.map(item => (
          <li key={item.id} className="navigation__recent-item">
            <a
              href={item.href}
              className="navigation__recent-link"
              onClick={(e) => {
                e.preventDefault();
                handleRecentItemClick(item.id, item.href, item.label);
                window.history.pushState({}, '', item.href);
              }}
              title={item.label}
            >
              {!collapsed && (
                <span className="navigation__recent-label">
                  {item.label}
                </span>
              )}
              {collapsed && (
                <span className="navigation__recent-icon" aria-hidden="true">
                  📍
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderSearch = () => (
    <div className="navigation__search">
      {!collapsed && (
        <div className="navigation__search-container">
          <input
            type="text"
            placeholder="Search..."
            className="navigation__search-input"
            aria-label="Search navigation"
          />
          <span className="navigation__search-icon" aria-hidden="true">
            🔍
          </span>
        </div>
      )}
      {collapsed && (
        <button
          className="navigation__search-toggle"
          aria-label="Open search"
          title="Search"
        >
          <span className="navigation__search-icon" aria-hidden="true">
            🔍
          </span>
        </button>
      )}
    </div>
  );

  // ================================================
  // MAIN RENDER
  // ================================================

  const navigationClasses = [
    'navigation',
    `navigation--theme-${theme}`,
    collapsed ? 'navigation--collapsed' : 'navigation--expanded',
    isMobile ? 'navigation--mobile' : 'navigation--desktop',
    className
  ].filter(Boolean).join(' ');

  // Group items by category
  const mainItems = navigationItems.filter(item => item.category === 'main');
  const toolItems = navigationItems.filter(item => item.category === 'tools');
  const adminItems = navigationItems.filter(item => item.category === 'admin');

  return (
    <nav 
      className={navigationClasses}
      style={style}
      data-component="navigation"
      data-version="1.0.0"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="navigation__content">
        {/* Search */}
        {renderSearch()}

        {/* Main Navigation */}
        <div className="navigation__main">
          {renderCategory('main', mainItems, !collapsed ? 'Main' : null)}
        </div>

        {/* Tools Navigation */}
        {toolItems.length > 0 && (
          <div className="navigation__tools">
            {renderCategory('tools', toolItems, !collapsed ? 'Tools' : null)}
          </div>
        )}

        {/* Recent Items */}
        {recentItems.length > 0 && !collapsed && (
          <div className="navigation__recent-section">
            {renderRecentItems()}
          </div>
        )}

        {/* Admin Navigation */}
        {adminItems.length > 0 && (
          <div className="navigation__admin">
            {renderCategory('admin', adminItems, !collapsed ? 'Admin' : null)}
          </div>
        )}
      </div>

      {/* Collapsed recent items indicator */}
      {collapsed && recentItems.length > 0 && (
        <div className="navigation__recent-indicator">
          <span className="navigation__recent-dot" aria-label="Recent items available"></span>
        </div>
      )}
    </nav>
  );
};

// ================================================
// COMPONENT METADATA
// ================================================

Navigation.displayName = 'Navigation';

Navigation.defaultProps = {
  collapsed: false,
  isMobile: false,
  theme: 'light',
  className: '',
  style: {},
  onError: () => {}
};

// ================================================
// EXPORTS
// ================================================

export default Navigation;
