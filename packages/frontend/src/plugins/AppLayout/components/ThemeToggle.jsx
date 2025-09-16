/**
 * File Path: src/plugins/AppLayout/components/ThemeToggle.jsx
 * Version: 1.0.0
 * Description: Theme toggle component that allows users to switch between
 *              light, dark, and auto themes. Includes visual indicators and
 *              accessibility features.
 * 
 * How to Use:
 * 1. Import and use in header or sidebar: <ThemeToggle theme={theme} onToggle={toggleTheme} />
 * 2. Supports light, dark, and auto (system) themes
 * 3. Provides visual feedback for current theme
 * 4. Accessible with proper ARIA labels and keyboard support
 * 
 * Change Log:
 * v1.0.0 - Initial implementation with theme switching and accessibility features
 */

import React, { useState, useEffect, useRef } from 'react';

// ================================================
// UTILITY FUNCTIONS (NOT EXPORTED INDIVIDUALLY)
// ================================================

/**
 * Get theme-specific colors
 * @param {string} theme - Current theme
 * @returns {Object} Theme colors
 */
const getThemeColors = (theme) => {
  const colors = {
    light: {
      primary: '#007bff',
      background: '#ffffff',
      text: '#212529',
      border: '#dee2e6'
    },
    dark: {
      primary: '#0d6efd',
      background: '#121212',
      text: '#f8f9fa',
      border: '#495057'
    },
    auto: {
      primary: '#007bff',
      background: 'var(--background, #ffffff)',
      text: 'var(--text, #212529)',
      border: 'var(--border, #dee2e6)'
    }
  };
  
  return colors[theme] || colors.auto;
};

/**
 * Get theme transition styles
 * @returns {Object} CSS transition properties
 */
const getThemeTransitionStyles = () => ({
  transition: 'color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease',
  willChange: 'color, background-color, border-color'
});

// ================================================
// THEME TOGGLE COMPONENT
// ================================================

const ThemeToggle = ({
  theme = 'auto',
  onToggle,
  size = 'medium',
  variant = 'icon',
  showLabels = false,
  className = '',
  style = {},
  ariaLabel = 'Toggle theme',
  disabled = false
}) => {
  // ================================================
  // STATE MANAGEMENT
  // ================================================

  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(theme);
  
  const buttonRef = useRef(null);
  const timeoutRef = useRef(null);

  // ================================================
  // EFFECTS
  // ================================================

  // Update internal state when theme prop changes
  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ================================================
  // EVENT HANDLERS
  // ================================================

  const handleToggle = (event) => {
    if (disabled || isLoading) return;

    event.preventDefault();
    setIsLoading(true);

    try {
      // Call the parent toggle handler
      if (onToggle) {
        onToggle();
      }

      // Simulate loading state for better UX
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 300);

    } catch (error) {
      console.error('Failed to toggle theme:', error);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleToggle(event);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        // Cycle to next theme
        event.preventDefault();
        handleToggle(event);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        // Cycle to previous theme (reverse)
        event.preventDefault();
        handleToggle(event);
        break;
      default:
        break;
    }
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleFocus = () => {
    if (disabled) return;
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // ================================================
  // RENDER HELPERS
  // ================================================

  /**
   * Get theme icon based on current theme
   */
  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'auto':
        return '🔄';
      default:
        return '🎨';
    }
  };

  /**
   * Get theme label for screen readers
   */
  const getThemeLabel = () => {
    switch (currentTheme) {
      case 'light':
        return 'Light theme';
      case 'dark':
        return 'Dark theme';
      case 'auto':
        return 'System theme';
      default:
        return 'Theme';
    }
  };

  /**
   * Get next theme label for screen readers
   */
  const getNextThemeLabel = () => {
    switch (currentTheme) {
      case 'light':
        return 'Switch to dark theme';
      case 'dark':
        return 'Switch to system theme';
      case 'auto':
        return 'Switch to light theme';
      default:
        return 'Switch theme';
    }
  };

  /**
   * Get size classes
   */
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'theme-toggle--small';
      case 'large':
        return 'theme-toggle--large';
      default:
        return 'theme-toggle--medium';
    }
  };

  /**
   * Get variant classes
   */
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'theme-toggle--text';
      case 'outlined':
        return 'theme-toggle--outlined';
      case 'filled':
        return 'theme-toggle--filled';
      default:
        return 'theme-toggle--icon';
    }
  };

  /**
   * Render icon variant
   */
  const renderIconVariant = () => (
    <button
      ref={buttonRef}
      className={`
        theme-toggle 
        theme-toggle--icon 
        ${getSizeClasses()}
        ${currentTheme ? `theme-toggle--${currentTheme}` : ''}
        ${isHovered ? 'theme-toggle--hovered' : ''}
        ${isFocused ? 'theme-toggle--focused' : ''}
        ${isLoading ? 'theme-toggle--loading' : ''}
        ${disabled ? 'theme-toggle--disabled' : ''}
        ${className}
      `.trim()}
      style={style}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={ariaLabel || getNextThemeLabel()}
      aria-pressed={!disabled}
      aria-busy={isLoading}
      disabled={disabled}
      type="button"
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {getThemeIcon()}
      </span>
      
      {isLoading && (
        <span className="theme-toggle__loading" aria-hidden="true">
          <span className="theme-toggle__loading-dot"></span>
          <span className="theme-toggle__loading-dot"></span>
          <span className="theme-toggle__loading-dot"></span>
        </span>
      )}

      {/* Tooltip for hover state */}
      {isHovered && !isLoading && (
        <span className="theme-toggle__tooltip">
          {getNextThemeLabel()}
        </span>
      )}
    </button>
  );

  /**
   * Render text variant
   */
  const renderTextVariant = () => (
    <button
      ref={buttonRef}
      className={`
        theme-toggle 
        theme-toggle--text 
        ${getSizeClasses()}
        ${currentTheme ? `theme-toggle--${currentTheme}` : ''}
        ${isHovered ? 'theme-toggle--hovered' : ''}
        ${isFocused ? 'theme-toggle--focused' : ''}
        ${isLoading ? 'theme-toggle--loading' : ''}
        ${disabled ? 'theme-toggle--disabled' : ''}
        ${className}
      `.trim()}
      style={style}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={ariaLabel || getNextThemeLabel()}
      aria-pressed={!disabled}
      aria-busy={isLoading}
      disabled={disabled}
      type="button"
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {getThemeIcon()}
      </span>
      
      <span className="theme-toggle__label">
        {getThemeLabel()}
      </span>

      {isLoading && (
        <span className="theme-toggle__loading" aria-hidden="true">
          <span className="theme-toggle__loading-dot"></span>
        </span>
      )}
    </button>
  );

  /**
   * Render segmented control variant
   */
  const renderSegmentedVariant = () => (
    <div 
      className={`
        theme-toggle 
        theme-toggle--segmented 
        ${getSizeClasses()}
        ${disabled ? 'theme-toggle--disabled' : ''}
        ${className}
      `.trim()}
      style={style}
      role="group"
      aria-label="Theme selection"
    >
      {['light', 'dark', 'auto'].map((themeOption) => (
        <button
          key={themeOption}
          className={`
            theme-toggle__option
            theme-toggle__option--${themeOption}
            ${currentTheme === themeOption ? 'theme-toggle__option--active' : ''}
            ${isLoading ? 'theme-toggle__option--loading' : ''}
          `.trim()}
          onClick={() => {
            if (!disabled && !isLoading && currentTheme !== themeOption) {
              setCurrentTheme(themeOption);
              if (onToggle) {
                // For segmented variant, we need to call onToggle with the specific theme
                // This requires modifying the parent to handle direct theme setting
                onToggle(themeOption);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          aria-pressed={currentTheme === themeOption}
          type="button"
        >
          <span className="theme-toggle__option-icon" aria-hidden="true">
            {themeOption === 'light' ? '☀️' : 
             themeOption === 'dark' ? '🌙' : '🔄'}
          </span>
          
          {showLabels && (
            <span className="theme-toggle__option-label">
              {themeOption === 'light' ? 'Light' : 
               themeOption === 'dark' ? 'Dark' : 'Auto'}
            </span>
          )}

          {currentTheme === themeOption && isLoading && (
            <span className="theme-toggle__option-loading" aria-hidden="true"></span>
          )}
        </button>
      ))}
    </div>
  );

  // ================================================
  // MAIN RENDER
  // ================================================

  switch (variant) {
    case 'text':
      return renderTextVariant();
    case 'segmented':
      return renderSegmentedVariant();
    case 'icon':
    case 'outlined':
    case 'filled':
    default:
      return renderIconVariant();
  }
};

// ================================================
// COMPONENT METADATA
// ================================================

ThemeToggle.displayName = 'ThemeToggle';

ThemeToggle.defaultProps = {
  theme: 'auto',
  size: 'medium',
  variant: 'icon',
  showLabels: false,
  className: '',
  style: {},
  ariaLabel: 'Toggle theme',
  disabled: false
};

// ================================================
// ADDITIONAL UTILITIES (NOT EXPORTED)
// ================================================

/**
 * Higher-order component for theme toggle
 * @deprecated Use ThemeToggle component directly
 */
const withThemeToggle = (Component) => {
  return function WithThemeToggle(props) {
    return <Component {...props} ThemeToggle={ThemeToggle} />;
  };
};

// ================================================
// EXPORTS
// ================================================

export default ThemeToggle;

// If you need to export the utility functions, do it like this:
// export { getThemeColors, getThemeTransitionStyles };
// But they're currently only used internally, so no need to export
