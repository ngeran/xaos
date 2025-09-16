/**
 * File Path: src/plugins/AppLayout/hooks/useLayout.js
 * Version: 1.0.0
 * Description: Custom hook for responsive layout management, including
 *              screen size detection, breakpoint handling, and responsive state.
 * 
 * How to Use:
 * 1. Import and use in layout components: const { isMobile, screenSize } = useLayout()
 * 2. Handles responsive breakpoints and screen size changes
 * 3. Provides mobile/tablet/desktop detection
 * 4. Manages responsive layout state
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with responsive breakpoints and screen size detection
 */

import { useState, useEffect, useCallback } from 'react';

// ================================================
// BREAKPOINT CONSTANTS
// ================================================

export const BREAKPOINTS = {
  XS: 0,      // Extra small devices (portrait phones)
  SM: 640,    // Small devices (landscape phones)
  MD: 768,    // Medium devices (tablets)
  LG: 1024,   // Large devices (desktops)
  XL: 1280,   // Extra large devices (large desktops)
  XXL: 1536   // Extra extra large devices
};

export const SCREEN_SIZES = {
  MOBILE: 'mobile',      // < 768px
  TABLET: 'tablet',      // 768px - 1023px
  DESKTOP: 'desktop',    // ≥ 1024px
  XL: 'xl',              // ≥ 1280px
  XXL: 'xxl'             // ≥ 1536px
};

// ================================================
// LAYOUT HOOK
// ================================================

/**
 * Custom hook for responsive layout management
 * @param {Object} options - Configuration options
 * @returns {Object} Layout state and utility functions
 */
export const useLayout = (options = {}) => {
  // ================================================
  // STATE MANAGEMENT
  // ================================================

  const [screenSize, setScreenSize] = useState(SCREEN_SIZES.DESKTOP);
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 0, 
    height: typeof window !== 'undefined' ? window.innerHeight : 0 
  });
  const [breakpoint, setBreakpoint] = useState('lg');
  const [isReady, setIsReady] = useState(false);

  // ================================================
  // UTILITY FUNCTIONS
  // ================================================

  /**
   * Get current screen size category
   * @param {number} width - Window width
   * @returns {string} Screen size category
   */
  const getScreenSize = useCallback((width) => {
    if (width < BREAKPOINTS.MD) return SCREEN_SIZES.MOBILE;
    if (width < BREAKPOINTS.LG) return SCREEN_SIZES.TABLET;
    if (width < BREAKPOINTS.XL) return SCREEN_SIZES.DESKTOP;
    if (width < BREAKPOINTS.XXL) return SCREEN_SIZES.XL;
    return SCREEN_SIZES.XXL;
  }, []);

  /**
   * Get current breakpoint name
   * @param {number} width - Window width
   * @returns {string} Breakpoint name
   */
  const getBreakpoint = useCallback((width) => {
    if (width < BREAKPOINTS.SM) return 'xs';
    if (width < BREAKPOINTS.MD) return 'sm';
    if (width < BREAKPOINTS.LG) return 'md';
    if (width < BREAKPOINTS.XL) return 'lg';
    if (width < BREAKPOINTS.XXL) return 'xl';
    return 'xxl';
  }, []);

  /**
   * Check if current screen size is mobile
   * @param {string} size - Screen size to check
   * @returns {boolean} True if mobile
   */
  const isMobileSize = useCallback((size) => {
    return size === SCREEN_SIZES.MOBILE;
  }, []);

  /**
   * Check if current screen size is tablet
   * @param {string} size - Screen size to check
   * @returns {boolean} True if tablet
   */
  const isTabletSize = useCallback((size) => {
    return size === SCREEN_SIZES.TABLET;
  }, []);

  /**
   * Check if current screen size is desktop
   * @param {string} size - Screen size to check
   * @returns {boolean} True if desktop
   */
  const isDesktopSize = useCallback((size) => {
    return [SCREEN_SIZES.DESKTOP, SCREEN_SIZES.XL, SCREEN_SIZES.XXL].includes(size);
  }, []);

  // ================================================
  // COMPUTED PROPERTIES
  // ================================================

  const isMobile = isMobileSize(screenSize);
  const isTablet = isTabletSize(screenSize);
  const isDesktop = isDesktopSize(screenSize);
  const isLargeScreen = ['xl', 'xxl'].includes(breakpoint);
  const isSmallScreen = ['xs', 'sm', 'md'].includes(breakpoint);

  // ================================================
  // EFFECTS
  // ================================================

  // Initialize layout on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });
      setScreenSize(getScreenSize(width));
      setBreakpoint(getBreakpoint(width));
      
      if (!isReady) {
        setIsReady(true);
      }
    };

    // Initial setup
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [getScreenSize, getBreakpoint, isReady]);

  // ================================================
  // RESPONSIVE UTILITIES
  // ================================================

  /**
   * Check if current breakpoint matches or is larger than target
   * @param {string} targetBreakpoint - Target breakpoint to check
   * @returns {boolean} True if current breakpoint matches or is larger
   */
  const isBreakpointUp = useCallback((targetBreakpoint) => {
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const currentIndex = breakpoints.indexOf(breakpoint);
    const targetIndex = breakpoints.indexOf(targetBreakpoint);
    
    return currentIndex >= targetIndex;
  }, [breakpoint]);

  /**
   * Check if current breakpoint matches or is smaller than target
   * @param {string} targetBreakpoint - Target breakpoint to check
   * @returns {boolean} True if current breakpoint matches or is smaller
   */
  const isBreakpointDown = useCallback((targetBreakpoint) => {
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const currentIndex = breakpoints.indexOf(breakpoint);
    const targetIndex = breakpoints.indexOf(targetBreakpoint);
    
    return currentIndex <= targetIndex;
  }, [breakpoint]);

  /**
   * Check if current breakpoint is between two breakpoints
   * @param {string} minBreakpoint - Minimum breakpoint
   * @param {string} maxBreakpoint - Maximum breakpoint
   * @returns {boolean} True if current breakpoint is in range
   */
  const isBreakpointBetween = useCallback((minBreakpoint, maxBreakpoint) => {
    return isBreakpointUp(minBreakpoint) && isBreakpointDown(maxBreakpoint);
  }, [isBreakpointUp, isBreakpointDown]);

  /**
   * Get responsive value based on breakpoint
   * @param {Object} values - Values for different breakpoints
   * @returns {*} Value for current breakpoint
   */
  const getResponsiveValue = useCallback((values) => {
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const currentIndex = breakpoints.indexOf(breakpoint);
    
    // Find the closest matching breakpoint value
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpoints[i];
      if (values[bp] !== undefined) {
        return values[bp];
      }
    }
    
    // Fallback to default or first available value
    return values.default || Object.values(values)[0];
  }, [breakpoint]);

  // ================================================
  // LAYOUT INFORMATION
  // ================================================

  /**
   * Get layout information object
   */
  const getLayoutInfo = useCallback(() => ({
    screenSize,
    breakpoint,
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    isSmallScreen,
    breakpoints: BREAKPOINTS,
    screenSizes: SCREEN_SIZES
  }), [screenSize, breakpoint, windowSize, isMobile, isTablet, isDesktop, isLargeScreen, isSmallScreen]);

  /**
   * Get CSS media query string for breakpoint
   * @param {string} min - Minimum breakpoint
   * @param {string} max - Maximum breakpoint
   * @returns {string} CSS media query
   */
  const getMediaQuery = useCallback((min = null, max = null) => {
    let query = '';
    
    if (min) {
      const minWidth = BREAKPOINTS[min.toUpperCase()];
      query += `(min-width: ${minWidth}px)`;
    }
    
    if (max) {
      const maxWidth = BREAKPOINTS[max.toUpperCase()] - 1;
      if (query) query += ' and ';
      query += `(max-width: ${maxWidth}px)`;
    }
    
    return query;
  }, []);

  // ================================================
  // EXPORT
  // ================================================

  return {
    // State
    screenSize,
    breakpoint,
    windowSize,
    isReady,
    
    // Boolean flags
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    isSmallScreen,
    
    // Utility functions
    isBreakpointUp,
    isBreakpointDown,
    isBreakpointBetween,
    getResponsiveValue,
    getMediaQuery,
    
    // Information
    getLayoutInfo,
    
    // Constants (for convenience)
    BREAKPOINTS,
    SCREEN_SIZES
  };
};

// ================================================
// ADDITIONAL UTILITIES
// ================================================

/**
 * Higher-order component for layout context
 * @deprecated Use useLayout hook directly instead
 */
export const withLayout = (Component) => {
  return function WithLayout(props) {
    const layout = useLayout();
    return <Component {...props} layout={layout} />;
  };
};

/**
 * Get responsive class names based on breakpoint
 * @param {string} breakpoint - Current breakpoint
 * @returns {string} CSS class names
 */
export const getResponsiveClasses = (breakpoint) => {
  return `breakpoint-${breakpoint} ${breakpoint === 'xs' || breakpoint === 'sm' ? 'mobile-layout' : 'desktop-layout'}`;
};

/**
 * Debounced resize handler
 * @param {Function} callback - Callback function
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debouncedResize = (callback, delay = 250) => {
  let timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(callback, delay);
  };
};

/**
 * Throttled resize handler
 * @param {Function} callback - Callback function
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttledResize = (callback, limit = 100) => {
  let waiting = false;
  return function() {
    if (!waiting) {
      callback.apply(this, arguments);
      waiting = true;
      setTimeout(() => {
        waiting = false;
      }, limit);
    }
  };
};

export default useLayout;
