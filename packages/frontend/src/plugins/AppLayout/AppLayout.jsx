/**
 * File Path: src/plugins/AppLayout/AppLayout.jsx
 * Version: 3.0.1
 * Description: Core layout plugin component with modular structure.
 *              Integrates Header, Footer, Hero, and MainContent sections.
 *              Provides global layout context, theme management, and 
 *              mega-menu event handling.
 *
 * Key Features:
 * - Centralized layout structure (Header, Hero, MainContent, Footer).
 * - Global theme management (Dark, Light, Yellow) via `useTheme` hook.
 * - Responsive design logic using `useLayout` hook.
 * - Mega-menu interaction handling for dynamic navigation.
 * - Provides layout context to all child components for shared state.
 *
 * Detail How-To Guide:
 * 1. Wrap your application with `<AppLayout>` at the highest level.
 * 2. Pass `config` prop for layout options (e.g., `showHeader: false`).
 * 3. Pass `context` prop to integrate with an external application state.
 * 4. Children components will be rendered within the `MainContent` area.
 * 5. Theme can be toggled via the Header's theme button, or `toggleTheme()` from `useLayoutContext()`.
 *
 * Change Log:
 * - 3.0.1 (2023-10-27): Updated header comments to meet new documentation standards.
 * - 3.0.0 (2023-10-20): Initial release with modular components, theme management, and mega-menu.
 */

// =============================================================
// IMPORTS & SETUP
// =============================================================
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLayout } from './hooks/useLayout.jsx';
import { useTheme } from './hooks/useTheme.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Hero from './components/Hero.jsx';
import MainContent from './components/MainContent.jsx';
import './app-layout.css';
// =============================================================
// LAYOUT CONTEXT DEFINITION
// Provides shared state for all layout-related components
// =============================================================
export const LayoutContext = createContext({});

/**
 * Custom hook for consuming LayoutContext.
 * Ensures usage only inside a LayoutContext.Provider.
 */
export const useLayoutContext = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutContext.Provider');
  }
  return context;
};

// =============================================================
// MAIN APP LAYOUT COMPONENT
// =============================================================
const AppLayout = ({ config, context, children }) => {
  // -------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------
  const [activeMegaMenu, setActiveMegaMenu] = useState(null); // Which mega menu is open
  const menuTimeoutRef = useRef(null); // Timer for delayed closing

  // -------------------------------------------------------------
  // HOOKS & CONTEXT
  // -------------------------------------------------------------
  const { isMobile } = useLayout(); // Responsive detection
  const { theme, toggleTheme, isDark } = useTheme('dark'); // Theme hook

  // Safely destructure app context (with fallbacks)
  const { appState = {}, updateAppState = () => {} } = context || {};
  const {
    isHeaderEnabled = true,
    isFooterEnabled = true,
  } = appState.layout || {};

  // -------------------------------------------------------------
  // EFFECTS (Lifecycle & Theme Management)
  // -------------------------------------------------------------

  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
    };
  }, []);

  // Keep <body data-theme="..."> and <html class="dark"> in sync with theme
  // This ensures compatibility with both custom data-theme attributes and standard .dark class CSS
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    const html = document.documentElement;
    // Also toggle the standard .dark class on the html element for CSS variable compatibility
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  // -------------------------------------------------------------
  // EVENT HANDLERS (MegaMenu Logic)
  // -------------------------------------------------------------

  /**
   * Handle hover/focus enter on a menu item
   * @param {string} menuName - The name of the mega menu to activate.
   */
  const handleMenuEnter = (menuName) => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    setActiveMegaMenu(menuName);
  };

  /**
   * Handle leaving a menu area (delays close slightly for UX).
   * Sets a timeout to close the mega menu.
   */
  const handleMenuLeave = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 200);
  };

  // -------------------------------------------------------------
  // CONFIGURATION MERGING
  // Merge props config with context preferences
  // -------------------------------------------------------------
  const mergedConfig = {
    showHeader: true,
    showFooter: true,
    ...config,
    ...appState.preferences?.layout,
  };

  // -------------------------------------------------------------
  // CONTEXT VALUE (Provided to all children)
  // -------------------------------------------------------------
  const layoutContextValue = {
    pluginContext: context,
    config: mergedConfig,
    appState,
    updateAppState,
    isMobile,
    theme,
    toggleTheme,
    isDark,
    activeMegaMenu,
    onMenuEnter: handleMenuEnter,
    onMenuLeave: handleMenuLeave,
  };

  // -------------------------------------------------------------
  // RENDER STRUCTURE
  // Header → Hero → MainContent → Dynamic Children → Footer
  // -------------------------------------------------------------
  return (
    <LayoutContext.Provider value={layoutContextValue}>
      <div className="app-layout" data-theme={theme}>
        {/* ======================= HEADER ======================= */}
        {isHeaderEnabled && mergedConfig.showHeader && (
          <nav className="navbar">
            <Header
              config={mergedConfig}
              isMobile={isMobile}
              activeMegaMenu={activeMegaMenu}
              onMenuEnter={handleMenuEnter}
              onMenuLeave={handleMenuLeave}
              onError={(error, ctx) => {
                console.error('Header error:', error, 'Context:', ctx);
              }}
            />
          </nav>
        )}

        {/* ======================= HERO ========================= */}
        {/* <Hero /> */}

        {/* =================== MAIN CONTENT ==================== */}
        <MainContent>
          {/* Children from higher-level routes/pages */}
          {children}
        </MainContent>

        {/* ======================= FOOTER ======================= */}
        {isFooterEnabled && mergedConfig.showFooter && (
          <Footer config={mergedConfig} theme={theme} isMobile={isMobile} />
        )}
      </div>
    </LayoutContext.Provider>
  );
};

// =============================================================
// DEFAULT PROPS & EXPORT
// =============================================================
AppLayout.displayName = 'AppLayout';

AppLayout.defaultProps = {
  config: {},
  context: {},
};

export default AppLayout;
