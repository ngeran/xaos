
/**
 * File Path: src/shared/WorkflowContainer.jsx
 * Version: 1.1.0
 *
 * Description:
 * A flexible container component that provides a sidebar-main content layout pattern
 * commonly used in workflow-based interfaces. Fully supports dark/light theme switching
 * using CSS variables.
 *
 * Key Features:
 * - Full dark/light mode support with CSS variables
 * - Collapsible sidebar with smooth transitions
 * - Flexible header with action buttons
 * - Responsive design with mobile support
 * - Tooltip support for collapsed state
 * - Clean separation of sidebar and main content
 *
 * Usage Guide:
 *
 * Basic Example:
 * ```jsx
 * import { WorkflowContainer } from '@/shared/WorkflowContainer';
 *
 * function MyWorkflow() {
 *   return (
 *     <WorkflowContainer
 *       sidebarContent={<MySidebarContent />}
 *       sidebarHeader={<MySidebarHeader />}
 *       headerContent={<MyHeaderContent />}
 *       mainContent={<MyMainContent />}
 *     />
 *   );
 * }
 * ```
 *
 * Advanced Example with all props:
 * ```jsx
 * <WorkflowContainer
 *   sidebarContent={sidebarItems}
 *   sidebarHeader={headerComponent}
 *   headerContent={actionButtons}
 *   mainContent={tabbedInterface}
 *   defaultCollapsed={false}
 *   sidebarWidth="320px"
 *   className="custom-class"
 *   onSidebarToggle={(isCollapsed) => console.log('Sidebar:', isCollapsed)}
 * />
 * ```
 */
 
import React, { useState, useCallback, memo } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CollapsiblePanel } from './CollapsiblePanel';
 
// =============================================================================
// SECTION 1: TYPE DEFINITIONS AND INTERFACES
// =============================================================================
/**
 * Props interface for WorkflowContainer
 * @typedef {Object} WorkflowContainerProps
 * @property {React.ReactNode} sidebarContent - Content to display in the sidebar
 * @property {React.ReactNode} sidebarHeader - Header content for the sidebar
 * @property {React.ReactNode} mainContent - Main content area
 * @property {React.ReactNode} headerContent - Header content for main area
 * @property {boolean} defaultCollapsed - Initial collapsed state
 * @property {string} sidebarWidth - Width of sidebar when expanded
 * @property {string} className - Additional CSS classes
 * @property {Function} onSidebarToggle - Callback when sidebar toggles
 */
 
// =============================================================================
// SECTION 2: MAIN COMPONENT IMPLEMENTATION
// =============================================================================
export const WorkflowContainer = memo(({
  sidebarContent,
  sidebarHeader,
  mainContent,
  headerContent,
  defaultCollapsed = false,
  sidebarWidth = '320px',
  className,
  onSidebarToggle
}) => {
  // --- State Management ---
  // Manages the collapsed/expanded state of the sidebar
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
 
  // --- Event Handlers ---
  // Handles sidebar toggle with optional callback
  const handleToggle = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onSidebarToggle?.(newState);
  }, [isCollapsed, onSidebarToggle]);
 
  // =============================================================================
  // SECTION 3: RENDER LAYOUT STRUCTURE
  // =============================================================================
  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn(
        // Using CSS variables for theming
        "flex h-full w-full bg-background text-foreground",
        className
      )}>
        {/* Sidebar Panel - Collapsible navigation area */}
        <CollapsiblePanel
          isCollapsed={isCollapsed}
          onToggle={handleToggle}
          header={sidebarHeader}
          expandedWidth={sidebarWidth}
          collapsedWidth="64px"
          className="border-r border-border bg-sidebar text-sidebar-foreground"
        >
          {sidebarContent}
        </CollapsiblePanel>
 
        {/* Main Content Area - Primary workspace */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
          {/* Header Bar - Contains title and action buttons */}
          {headerContent && (
            <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-6 shrink-0">
              {headerContent}
            </header>
          )}
 
          {/* Content Area - Scrollable main content */}
          <div className="flex-1 overflow-y-auto bg-muted/40">
            {mainContent}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
});
 
WorkflowContainer.displayName = 'WorkflowContainer';
