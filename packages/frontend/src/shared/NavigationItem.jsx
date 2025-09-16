
/**
 * File Path: src/shared/NavigationItem.jsx
 * Version: 1.1.0
 *
 * Description:
 * A flexible navigation item component that adapts to collapsed/expanded states.
 * Fully supports dark/light theme switching using CSS variables.
 *
 * Key Features:
 * - Full dark/light mode support
 * - Icon and text display
 * - Tooltip support for collapsed state
 * - Active state styling
 * - Badge/count display
 * - Optional description text
 * - Keyboard navigation support
 *
 * Usage Guide:
 *
 * Basic Example:
 * ```jsx
 * import { NavigationItem } from '@/shared/NavigationItem';
 * import { Home } from 'lucide-react';
 *
 * <NavigationItem
 *   icon={Home}
 *   label="Dashboard"
 *   onClick={() => navigate('/dashboard')}
 * />
 * ```
 *
 * Advanced Example:
 * ```jsx
 * <NavigationItem
 *   icon={Shield}
 *   label="Security Tests"
 *   description="15 tests available"
 *   isActive={currentPath === '/security'}
 *   isCollapsed={sidebarCollapsed}
 *   badge={<Badge variant="secondary">15</Badge>}
 *   onClick={handleNavigation}
 *   className="my-custom-class"
 * />
 * ```
 */
 
import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
 
// =============================================================================
// SECTION 1: COMPONENT IMPLEMENTATION
// =============================================================================
export const NavigationItem = memo(({
  icon: Icon,
  label,
  description,
  isActive = false,
  isCollapsed = false,
  onClick,
  badge,
  className,
  disabled = false,
  ...props
}) => {
  // --- Render Helper ---
  // Creates the main content structure with theme-aware styling
  const renderContent = () => (
    <div
      className={cn(
        // Base styles with CSS variables
        "flex items-center gap-3 px-3 py-2 rounded-md",
        "cursor-pointer transition-all duration-150",
        // Active state using sidebar-specific CSS variables
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
        // Hover state with theme awareness
        !isActive && !disabled && "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",
        // Layout adjustments for collapsed state
        isCollapsed && "justify-center px-2",
        className
      )}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      {...props}
    >
      {/* Icon Display with theme-aware colors */}
      {Icon && (
        <Icon className={cn(
          "shrink-0 transition-colors duration-150",
          isActive ? "text-sidebar-primary" : "text-muted-foreground",
          isCollapsed ? "h-5 w-5" : "h-4 w-4"
        )} />
      )}
 
      {/* Text Content - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate">{label}</span>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
 
  // =============================================================================
  // SECTION 2: CONDITIONAL RENDERING WITH TOOLTIP
  // =============================================================================
  // Show tooltip only when collapsed and label exists
  if (isCollapsed && label) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {renderContent()}
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="flex flex-col gap-1 bg-popover text-popover-foreground border-border"
        >
          <span className="font-medium">{label}</span>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }
 
  return renderContent();
});
 
NavigationItem.displayName = 'NavigationItem';
