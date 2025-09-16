/**
 * File Path: src/plugins/AppLayout/hooks/useTheme.js
 * Version: 1.0.0
 * Description: Custom hook for theme management, including theme switching,
 *              system preference detection, and theme persistence.
 * 
 * How to Use:
 * 1. Import and use in layout components: const { theme, toggleTheme } = useTheme(initialTheme)
 * 2. Handles theme switching between light, dark, and auto modes
 * 3. Detects system preference for auto mode
 * 4. Persists theme preferences in localStorage
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with theme switching and system preference detection
 */

import { useState, useEffect, useCallback } from 'react';

// ================================================
// THEME HOOK
// ================================================

/**
 * Custom hook for theme management
 * @param {string} initialTheme - Initial theme ('light', 'dark', or 'auto')
 * @returns {Object} Theme state and control functions
 */
export const useTheme = (initialTheme = 'auto') => {
  // ================================================
  // STATE MANAGEMENT
  // ================================================

  const [theme, setTheme] = useState(initialTheme);
  const [systemPreference, setSystemPreference] = useState('light');
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // ================================================
  // UTILITY FUNCTIONS
  // ================================================

  /**
   * Check if system prefers dark mode
   * @returns {boolean} True if system prefers dark mode
   */
  const getSystemPreference = useCallback(() => {
    if (typeof window === 'undefined') return 'light';
    
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  }, []);

  /**
   * Get effective theme (resolves 'auto' to system preference)
   * @returns {string} Effective theme ('light' or 'dark')
   */
  const getEffectiveTheme = useCallback(() => {
    return theme === 'auto' ? systemPreference : theme;
  }, [theme, systemPreference]);

  /**
   * Check if effective theme is dark
   * @returns {boolean} True if effective theme is dark
   */
  const getIsDark = useCallback(() => {
    return getEffectiveTheme() === 'dark';
  }, [getEffectiveTheme]);

  // ================================================
  // EFFECTS
  // ================================================

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    try {
      // Load saved theme from localStorage
      const savedTheme = localStorage.getItem('app-theme');
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setTheme(savedTheme);
      }

      // Get initial system preference
      const initialSystemPreference = getSystemPreference();
      setSystemPreference(initialSystemPreference);
      setIsLoaded(true);

    } catch (error) {
      console.error('Failed to initialize theme:', error);
      setSystemPreference('light');
      setIsLoaded(true);
    }
  }, [getSystemPreference]);

  // Update isDark state when theme or system preference changes
  useEffect(() => {
    setIsDark(getIsDark());
  }, [getIsDark]);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemPreferenceChange = (event) => {
      const newPreference = event.matches ? 'dark' : 'light';
      setSystemPreference(newPreference);
    };

    // Add event listener for system preference changes
    mediaQuery.addEventListener('change', handleSystemPreferenceChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemPreferenceChange);
    };
  }, []);

  // Persist theme preference to localStorage
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem('app-theme', theme);
    } catch (error) {
      console.error('Failed to persist theme preference:', error);
    }
  }, [theme, isLoaded]);

  // ================================================
  // EVENT HANDLERS
  // ================================================

  /**
   * Toggle between light, dark, and auto themes
   */
  const toggleTheme = useCallback(() => {
    setTheme(current => {
      switch (current) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'auto';
        case 'auto':
          return 'light';
        default:
          return 'auto';
      }
    });
  }, []);

  /**
   * Set specific theme
   * @param {string} newTheme - Theme to set ('light', 'dark', or 'auto')
   */
  const setSpecificTheme = useCallback((newTheme) => {
    if (['light', 'dark', 'auto'].includes(newTheme)) {
      setTheme(newTheme);
    }
  }, []);

  /**
   * Cycle through themes in order
   */
  const cycleTheme = useCallback(() => {
    setTheme(current => {
      const themes = ['light', 'dark', 'auto'];
      const currentIndex = themes.indexOf(current);
      const nextIndex = (currentIndex + 1) % themes.length;
      return themes[nextIndex];
    });
  }, []);

  /**
   * Reset theme to system preference (auto)
   */
  const resetToSystemTheme = useCallback(() => {
    setTheme('auto');
  }, []);

  // ================================================
  // THEME INFORMATION
  // ================================================

  /**
   * Get theme information object
   */
  const getThemeInfo = useCallback(() => ({
    current: theme,
    effective: getEffectiveTheme(),
    systemPreference,
    isDark: getIsDark(),
    isAuto: theme === 'auto',
    isManual: theme !== 'auto',
    isLight: getEffectiveTheme() === 'light',
  }), [theme, getEffectiveTheme, systemPreference, getIsDark]);

  /**
   * Get all available themes
   */
  const getAvailableThemes = useCallback(() => ([
    { id: 'light', label: 'Light', description: 'Light theme' },
    { id: 'dark', label: 'Dark', description: 'Dark theme' },
    { id: 'auto', label: 'Auto', description: 'Follow system preference' }
  ]), []);

  // ================================================
  // EXPORT
  // ================================================

  return {
    // State
    theme,
    systemPreference,
    isDark,
    isLoaded,
    
    // Effective values
    effectiveTheme: getEffectiveTheme(),
    isAuto: theme === 'auto',
    
    // Actions
    toggleTheme,
    setTheme: setSpecificTheme,
    cycleTheme,
    resetToSystemTheme,
    
    // Information
    getThemeInfo,
    getAvailableThemes,
    
    // Utility functions
    getSystemPreference,
    getEffectiveTheme,
    getIsDark
  };
};

// ================================================
// ADDITIONAL UTILITIES
// ================================================

/**
 * Higher-order component for theme context
 * @deprecated Use useTheme hook directly instead
 */
export const withTheme = (Component) => {
  return function WithTheme(props) {
    const theme = useTheme(props.initialTheme);
    return <Component {...props} theme={theme} />;
  };
};

/**
 * Get theme class names for CSS
 * @param {string} theme - Current theme
 * @param {string} systemPreference - System preference
 * @returns {string} CSS class names
 */
export const getThemeClasses = (theme, systemPreference) => {
  const effectiveTheme = theme === 'auto' ? systemPreference : theme;
  return `theme-${effectiveTheme} ${theme === 'auto' ? 'theme-auto' : 'theme-manual'}`;
};

/**
 * Check if dark mode is preferred
 * @returns {boolean} True if dark mode is preferred
 */
export const prefersDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
};

/**
 * Apply theme to document
 * @param {string} theme - Theme to apply
 * @param {string} systemPreference - System preference
 */
export const applyThemeToDocument = (theme, systemPreference) => {
  if (typeof document === 'undefined') return;
  
  const effectiveTheme = theme === 'auto' ? systemPreference : theme;
  
  // Set data-theme attribute
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  
  // Toggle dark class
  document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  document.documentElement.classList.toggle('light', effectiveTheme === 'light');
  
  // Set meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#1a1a1a' : '#ffffff');
  }
};

export default useTheme;
