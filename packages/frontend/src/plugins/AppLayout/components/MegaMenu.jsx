/**
 * File Path: src/plugins/AppLayout/components/MegaMenu.jsx
 * Version: 2.1.0
 * Description: Dynamic Mega Menu component that fetches navigation data
 *              from the backend API instead of local JSON file.
 *
 * Key Features:
 * - Loads categories and children dynamically from backend API
 * - Supports icons, titles, subtitles, and child links
 * - Handles active menu hover with callbacks from parent (Header)
 * - Backward-compatible: keeps same styling classes
 * - Error handling and loading states
 *
 * How-To Guide:
 * 1. Backend must be running on http://localhost:3001
 * 2. API endpoint: /api/navigation returns validated navigation data
 * 3. Pass `activeMenu`, `onMenuEnter`, `onMenuLeave` from `Header.jsx`
 * 4. Error handling is passed to parent component via `onError` prop
 *
 * Change Log:
 * - 2.1.0 (2025-09-14): Updated to fetch from backend API with error handling
 * - 2.0.0 (2025-09-13): Rewritten to load dynamic JSON data instead of static object.
 */

import React, { useState, useEffect } from 'react';

// ================================================
// MEGA MENU COMPONENT
// ================================================

const MegaMenu = ({ activeMenu, onMenuEnter, onMenuLeave, onError }) => {
  const [menuData, setMenuData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch navigation data from backend API
  useEffect(() => {
    const fetchNavigationData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:3001/api/navigation');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Extract the actual navigation data from the response
        // The API returns { valid: true, data: [...] }
        const navigationData = result.data || result;
        
        setMenuData(navigationData);
      } catch (err) {
        console.error('Failed to fetch navigation data:', err);
        setError(err.message);
        onError?.(err, 'navigation-fetch');
        
        // Fallback to empty array to prevent UI breakage
        setMenuData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNavigationData();
  }, [onError]);

  // ================================================
  // RENDER FUNCTIONS
  // ================================================

  /**
   * Renders the top-level navigation items
   */
  const renderMenuItems = () => {
    if (loading) {
      return (
        <div className="nav-link loading">
          <span>Loading...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="nav-link error" title={error}>
          <span>⚠️ Navigation</span>
        </div>
      );
    }

    if (menuData.length === 0) {
      return (
        <div className="nav-link">
          <span>No Navigation</span>
        </div>
      );
    }

    return menuData.map((menu) => (
      <div
        key={menu.id}
        className="relative"
        onMouseEnter={() => onMenuEnter(menu.id)}
        onMouseLeave={onMenuLeave}
      >
        <button className={`nav-link ${activeMenu === menu.id ? 'active' : ''}`}>
          {menu.icon && <span className="mr-1">{menu.icon}</span>}
          {menu.title}
          <svg className="icon-plus" viewBox="0 0 10 9" fill="none">
            <path
              d="M4.51172 5.09998V9H5.71172V5.09998H9.61719V3.89998L5.71172 3.89998V0H4.51172V3.89998L0.617188 3.89998V5.09998H4.51172Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    ));
  };

  /**
   * Renders the children (mega menu content) for active category
   */
  const renderMegaMenuContent = () => {
    if (!activeMenu) return null;

    const activeData = menuData.find((menu) => menu.id === activeMenu);
    if (!activeData) return null;

    return (
      <div
        className="floating__nav-modules active"
        onMouseEnter={() => onMenuEnter(activeMenu)}
        onMouseLeave={onMenuLeave}
      >
        <div className="mega-menu-wrapper">
          <div className="mega-menu-container">
            <div data-module={activeData.id} className="nav__module active">
              <div className="grid-layout-compact">
                {activeData.subtitle && (
                  <h4 className="opacity-70 mb-2">{activeData.subtitle}</h4>
                )}

                <div className="products-grid-compact">
                  {activeData.children?.map((child, idx) => (
                    <a
                      key={idx}
                      href={child.url || child.href} // Support both 'url' (new) and 'href' (old)
                      className="nav__module-inner is-item-compact"
                    >
                      <div className="nav__icon-wrap-compact">
                        {child.icon ? (
                          <span>{child.icon}</span>
                        ) : (
                          <svg viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="8" stroke="currentColor" />
                          </svg>
                        )}
                      </div>
                      <div className="module-info-compact">
                        <div className="nav__module-text">{child.title}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ================================================
  // MAIN RENDER
  // ================================================

  return (
    <>
      <nav className="nav-menu">
        {renderMenuItems()}
      </nav>

      {renderMegaMenuContent()}
    </>
  );
};

// ================================================
// DEFAULT PROPS
// ================================================

MegaMenu.displayName = 'MegaMenu';

MegaMenu.defaultProps = {
  activeMenu: null,
  onMenuEnter: () => {},
  onMenuLeave: () => {},
  onError: () => {},
};

export default MegaMenu;
