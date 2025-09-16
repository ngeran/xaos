
/**
 * File Path: src/shared/MultiTabInterface.jsx
 * Version: 1.1.0
 *
 * Description:
 * A reusable tabbed interface component that provides a clean way to organize
 * content into multiple tabs. Fully supports dark/light theme switching using CSS variables.
 *
 * Key Features:
 * - Full dark/light mode support
 * - Dynamic tab generation from configuration
 * - Icon and badge support
 * - Lazy loading support
 * - Keyboard navigation
 * - Customizable styling
 * - Status indicators
 *
 * Usage Guide:
 *
 * Basic Example:
 * ```jsx
 * import { MultiTabInterface } from '@/shared/MultiTabInterface';
 *
 * const tabs = [
 *   { id: 'overview', label: 'Overview', content: <Overview /> },
 *   { id: 'details', label: 'Details', content: <Details /> }
 * ];
 *
 * <MultiTabInterface
 *   tabs={tabs}
 *   defaultTab="overview"
 * />
 * ```
 *
 * Advanced Example:
 * ```jsx
 * const tabs = [
 *   {
 *     id: 'config',
 *     label: 'Configuration',
 *     icon: Settings,
 *     content: <ConfigPanel />,
 *     badge: <Badge>New</Badge>
 *   },
 *   {
 *     id: 'results',
 *     label: 'Results',
 *     icon: ChartBar,
 *     content: <ResultsPanel />,
 *     disabled: !hasResults,
 *     lazyLoad: true
 *   }
 * ];
 *
 * <MultiTabInterface
 *   tabs={tabs}
 *   activeTab={currentTab}
 *   onTabChange={setCurrentTab}
 *   variant="cards"
 *   className="my-tabs"
 * />
 * ```
 */
 
import React, { useState, useMemo, memo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
 
// =============================================================================
// SECTION 1: TYPE DEFINITIONS
// =============================================================================
/**
 * Tab configuration object
 * @typedef {Object} TabConfig
 * @property {string} id - Unique identifier for the tab
 * @property {string} label - Display label
 * @property {React.ComponentType} [icon] - Optional icon component
 * @property {React.ReactNode} content - Tab content
 * @property {React.ReactNode} [badge] - Optional badge element
 * @property {boolean} [disabled] - Whether tab is disabled
 * @property {boolean} [lazyLoad] - Whether to lazy load content
 */
 
// =============================================================================
// SECTION 2: MAIN COMPONENT
// =============================================================================
export const MultiTabInterface = memo(({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  defaultTab,
  variant = 'default',
  className,
  contentClassName,
  tabListClassName
}) => {
  // --- State Management ---
  // Use controlled or uncontrolled mode
  const [uncontrolledTab, setUncontrolledTab] = useState(
    defaultTab || tabs[0]?.id
  );
 
  const activeTab = controlledActiveTab ?? uncontrolledTab;
  const handleTabChange = onTabChange ?? setUncontrolledTab;
 
  // --- Computed Values ---
  // Calculate grid columns based on tab count
  const gridColumns = useMemo(() =>
    `repeat(${tabs.length}, 1fr)`,
    [tabs.length]
  );
 
  // --- Lazy Loading Support ---
  // Track which tabs have been visited for lazy loading
  const [visitedTabs, setVisitedTabs] = useState(new Set([activeTab]));
 
  React.useEffect(() => {
    setVisitedTabs(prev => new Set(prev).add(activeTab));
  }, [activeTab]);
 
  // =============================================================================
  // SECTION 3: RENDER VARIANTS
  // =============================================================================
  const contentVariants = {
    default: "mt-4",
    cards: "mt-4 bg-card text-card-foreground p-6 rounded-lg border border-border",
    compact: "mt-2"
  };
 
  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={cn("w-full", className)}
    >
      {/* Tab List - Navigation with theme support */}
      <TabsList
        className={cn(
          "grid w-full bg-muted text-muted-foreground",
          tabListClassName
        )}
        style={{ gridTemplateColumns: gridColumns }}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className={cn(
              "data-[state=active]:bg-background",
              "data-[state=active]:text-foreground",
              "data-[state=active]:font-medium",
              "data-[state=active]:shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-150"
            )}
          >
            <div className="flex items-center gap-2">
              {/* Tab Icon */}
              {tab.icon && (
                <tab.icon className="h-4 w-4" />
              )}
 
              {/* Tab Label */}
              <span>{tab.label}</span>
 
              {/* Tab Badge */}
              {tab.badge}
            </div>
          </TabsTrigger>
        ))}
      </TabsList>
 
      {/* Tab Content - Panels with theme support */}
      <div className={cn(
        contentVariants[variant] || contentVariants.default,
        contentClassName
      )}>
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
          >
            {/* Lazy Loading Logic */}
            {tab.lazyLoad && !visitedTabs.has(tab.id) ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Content will load when tab is selected
              </div>
            ) : (
              tab.content
            )}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
});
 
MultiTabInterface.displayName = 'MultiTabInterface';
