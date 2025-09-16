/**
 * File Path: src/plugins/AppLayout/components/Sidebar.jsx
 * Version: 1.0.0
 * Description: Application sidebar component that provides main navigation,
 *              user profile, and quick actions. Collapsible and responsive.
 * 
 * How to Use:
 * 1. Automatically rendered by AppLayout component
 * 2. Receives props from parent layout component
 * 3. Handles sidebar collapse/expand functionality
 * 4. Contains navigation and user profile sections
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with collapsible sidebar and navigation
 */

import React, { useState, useEffect } from 'react';
import { useLayoutContext } from '../AppLayout.jsx';

// ================================================
// SIDEBAR COMPONENT
// ================================================

const Sidebar = ({
  open,
  collapsed,
  onToggle,
  onToggleCollapse,
  config,
  isMobile,
  theme,
  onError,
  children,
  className = '',
  style = {}
}) => {
  // ================================================
  // STATE MANAGEMENT
  // ================================================

  const [activeItem, setActiveItem] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [quickActions, setQuickActions] = useState([]);

  // Get layout context
  const layoutContext = useLayoutContext();

  // ================================================
  // EFFECTS
  // ================================================

  useEffect(() => {
    // Initialize user profile data
    setUserProfile({
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Administrator',
      avatar: '👤',
      status: 'online'
    });

    // Initialize quick actions
    setQuickActions([
      { id: 'new-project', label: 'New Project', icon: '➕', action: 'create-project' },
      { id: 'upload', label: 'Upload File', icon: '📤', action: 'upload-file' },
      { id: 'settings', label: 'Settings', icon: '⚙️', action: 'open-settings' }
    ]);

    // Set initial active item based on current route
    setActiveItem(window.location.pathname.split('/')[1] || 'dashboard');
  }, []);

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      if (isMobile && open) {
        onToggle();
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [isMobile, open, onToggle]);

  // ================================================
  // EVENT HANDLERS
  // ================================================

  const handleItemClick = (itemId, itemHref) => {
    try {
      setActiveItem(itemId);
      
      layoutContext.pluginContext?.emit('sidebar:item:clicked', {
        itemId,
        itemHref,
        timestamp: new Date().toISOString()
      });

      // Close sidebar on mobile after click
      if (isMobile) {
        onToggle();
      }
    } catch (error) {
      onError?.(error, 'sidebar-item-click');
    }
  };

  const handleQuickAction = (actionId) => {
    try {
      layoutContext.pluginContext?.emit('sidebar:action:clicked', {
        actionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      onError?.(error, 'sidebar-action-click');
    }
  };

  const handleProfileClick = () => {
    try {
      layoutContext.pluginContext?.emit('sidebar:profile:clicked', {
        userId: userProfile?.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      onError?.(error, 'sidebar-profile-click');
    }
  };

  // ================================================
  // RENDER HELPERS
  // ================================================

  const renderUserProfile = () => (
    <div 
      className={`sidebar__profile ${collapsed ? 'sidebar__profile--collapsed' : ''}`}
      onClick={handleProfileClick}
      role="button"
      tabIndex={0}
      aria-label="User profile"
    >
      <div className="sidebar__profile-avatar">
        <span className="sidebar__profile-image" aria-hidden="true">
          {userProfile?.avatar}
        </span>
        {userProfile?.status === 'online' && (
          <span className="sidebar__profile-status" aria-label="Online"></span>
        )}
      </div>
      
      {!collapsed && (
        <div className="sidebar__profile-info">
          <div className="sidebar__profile-name">
            {userProfile?.name}
          </div>
          <div className="sidebar__profile-role">
            {userProfile?.role}
          </div>
        </div>
      )}
    </div>
  );

  const renderCollapseButton = () => (
    <button
      onClick={onToggleCollapse}
      className="sidebar__collapse-button"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand' : 'Collapse'}
    >
      <span 
        className={`sidebar__collapse-icon ${collapsed ? 'sidebar__collapse-icon--collapsed' : ''}`}
        aria-hidden="true"
      >
        {collapsed ? '▶' : '◀'}
      </span>
      {!collapsed && (
        <span className="sidebar__collapse-text">
          Collapse
        </span>
      )}
    </button>
  );

  const renderQuickActions = () => (
    <div className="sidebar__quick-actions">
      {!collapsed && (
        <h3 className="sidebar__quick-actions-title">
          Quick Actions
        </h3>
      )}
      <div className="sidebar__quick-actions-list">
        {quickActions.map(action => (
          <button
            key={action.id}
            onClick={() => handleQuickAction(action.action)}
            className="sidebar__quick-action"
            aria-label={action.label}
            title={action.label}
          >
            <span className="sidebar__quick-action-icon" aria-hidden="true">
              {action.icon}
            </span>
            {!collapsed && (
              <span className="sidebar__quick-action-label">
                {action.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderThemeSection = () => (
    <div className="sidebar__theme-section">
      {!collapsed && (
        <h3 className="sidebar__theme-title">
          Appearance
        </h3>
      )}
      <div className="sidebar__theme-options">
        <button
          onClick={() => layoutContext.setTheme?.('light')}
          className={`sidebar__theme-option ${theme === 'light' ? 'sidebar__theme-option--active' : ''}`}
          aria-label="Light theme"
          title="Light theme"
        >
          <span className="sidebar__theme-icon" aria-hidden="true">☀️</span>
          {!collapsed && <span>Light</span>}
        </button>
        <button
          onClick={() => layoutContext.setTheme?.('dark')}
          className={`sidebar__theme-option ${theme === 'dark' ? 'sidebar__theme-option--active' : ''}`}
          aria-label="Dark theme"
          title="Dark theme"
        >
          <span className="sidebar__theme-icon" aria-hidden="true">🌙</span>
          {!collapsed && <span>Dark</span>}
        </button>
      </div>
    </div>
  );

  // ================================================
  // MAIN RENDER
  // ================================================

  const sidebarClasses = [
    'sidebar',
    `sidebar--theme-${theme}`,
    open ? 'sidebar--open' : 'sidebar--closed',
    collapsed ? 'sidebar--collapsed' : 'sidebar--expanded',
    isMobile ? 'sidebar--mobile' : 'sidebar--desktop',
    className
  ].filter(Boolean).join(' ');

  if (!open && !isMobile) {
    return null;
  }

  return (
    <aside 
      className={sidebarClasses}
      style={style}
      data-component="sidebar"
      data-version="1.0.0"
      role="complementary"
      aria-label="Main navigation"
    >
      <div className="sidebar__content">
        {/* Header Section */}
        <div className="sidebar__header">
          {renderUserProfile()}
          {!isMobile && renderCollapseButton()}
        </div>

        {/* Navigation Section */}
        <div className="sidebar__navigation">
          {children}
        </div>

        {/* Quick Actions Section */}
        <div className="sidebar__actions">
          {renderQuickActions()}
        </div>

        {/* Theme Section */}
        <div className="sidebar__footer">
          {renderThemeSection()}
        </div>
      </div>

      {/* Mobile close button */}
      {isMobile && open && (
        <button
          onClick={onToggle}
          className="sidebar__mobile-close"
          aria-label="Close sidebar"
        >
          <span className="sidebar__mobile-close-icon" aria-hidden="true">
            ✕
          </span>
        </button>
      )}
    </aside>
  );
};

// ================================================
// COMPONENT METADATA
// ================================================

Sidebar.displayName = 'Sidebar';

Sidebar.defaultProps = {
  open: true,
  collapsed: false,
  config: {},
  isMobile: false,
  theme: 'light',
  className: '',
  style: {},
  onError: () => {},
  children: null
};

// ================================================
// EXPORTS
// ================================================

export default Sidebar;
