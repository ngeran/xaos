
/**
 * File Path: src/shared/CollapsiblePanel.jsx
 * Version: 1.1.0
 *
 * Description:
 * A reusable collapsible panel component that can transition between expanded
 * and collapsed states. Fully supports dark/light theme switching using CSS variables.
 *
 * Key Features:
 * - Full dark/light mode support
 * - Smooth width transitions
 * - Optional header section
 * - Toggle button with customizable position
 * - Preserves content during collapse
 * - Accessibility support
 *
 * Usage Guide:
 *
 * Basic Example:
 * ```jsx
 * import { CollapsiblePanel } from '@/shared/CollapsiblePanel';
 *
 * <CollapsiblePanel
 *   isCollapsed={false}
 *   onToggle={() => setCollapsed(!collapsed)}
 * >
 *   <div>Panel Content</div>
 * </CollapsiblePanel>
 * ```
 *
 * Advanced Example:
 * ```jsx
 * <CollapsiblePanel
 *   isCollapsed={isCollapsed}
 *   onToggle={handleToggle}
 *   header={<PanelHeader />}
 *   expandedWidth="400px"
 *   collapsedWidth="80px"
 *   toggleButtonPosition="top"
 *   className="custom-panel"
 * >
 *   <NavigationItems />
 * </CollapsiblePanel>
 * ```
 */
 
import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
 
// =============================================================================
// SECTION 1: COMPONENT PROPS AND DEFAULTS
// =============================================================================
const defaultProps = {
  expandedWidth: '320px',
  collapsedWidth: '64px',
  toggleButtonPosition: 'top',
  showToggleButton: true
};
 
// =============================================================================
// SECTION 2: MAIN COMPONENT
// =============================================================================
export const CollapsiblePanel = memo(({
  isCollapsed,
  onToggle,
  header,
  children,
  className,
  expandedWidth = defaultProps.expandedWidth,
  collapsedWidth = defaultProps.collapsedWidth,
  toggleButtonPosition = defaultProps.toggleButtonPosition,
  showToggleButton = defaultProps.showToggleButton
}) => {
  // --- Computed Styles ---
  // Dynamic width based on collapsed state
  const panelWidth = isCollapsed ? collapsedWidth : expandedWidth;
 
  // Toggle button positioning
  const toggleButtonStyles = {
    top: 'top-20',
    middle: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-20'
  };
 
  // =============================================================================
  // SECTION 3: RENDER PANEL STRUCTURE
  // =============================================================================
  return (
    <aside
      className={cn(
        // Using CSS variables for theming
        "relative bg-card text-card-foreground transition-all duration-300 ease-in-out flex flex-col",
        className
      )}
      style={{ width: panelWidth }}
    >
      {/* Panel Content Wrapper */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Section - Optional */}
        {header && (
          <div className={cn(
            "flex items-center h-16 border-b border-border px-4 shrink-0",
            "transition-opacity duration-200",
            isCollapsed ? "opacity-0" : "opacity-100"
          )}>
            {header}
          </div>
        )}
 
        {/* Main Content Area */}
        <div className={cn(
          "flex-1 overflow-y-auto",
          isCollapsed ? "p-2" : "p-4"
        )}>
          {children}
        </div>
      </div>
 
      {/* Toggle Button - Floating */}
      {showToggleButton && onToggle && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute -right-3 h-6 w-6 rounded-full",
            // Theme-aware styling
            "border border-border bg-background shadow-sm",
            "hover:bg-accent hover:text-accent-foreground",
            "hover:shadow-md transition-all duration-150",
            toggleButtonStyles[toggleButtonPosition]
          )}
          onClick={onToggle}
          aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      )}
    </aside>
  );
});
 
CollapsiblePanel.displayName = 'CollapsiblePanel';
