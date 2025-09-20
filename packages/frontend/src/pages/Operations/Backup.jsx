/**
 * File Path: src/pages/Operations/Backup.jsx
 * Version: 3.6.6
 *
 * Description:
 * Modern redesigned backup operations page with enhanced UI/UX and tab-based interface.
 * Features glassmorphism design, improved accessibility, and comprehensive light/dark mode support.
 * Uses WorkflowContainer for consistent layout with collapsible sidebar and a tabbed interface
 * for backup and restore operations, including configuration, execution, and results viewing.
 *
 * NEW: Fetches sidebar navigation items from API endpoint instead of hardcoded values.
 * UPDATE (v3.6.4): Removed <TabsList> component (tab navigation bar) from restore tab, retaining step indicator and <TabsContent> for Restore, Execute, Results. Navigation now relies on buttons and programmatic state changes.
 * UPDATE (v3.6.5): Updated backup API integration to use new endpoints: /api/backups/devices and /api/backups/device/:device_name. Fixed data mapping to match actual API response format.
 * UPDATE (v3.6.6): Fixed header alignment between sidebar and main content headers for better visual consistency.
 *
 * Key Features:
 * - Modern glassmorphism design with gradient overlays and backdrop blur
 * - Tab-based interface for backup and restore: Restore, Execute, Results (without tab navigation bar for restore)
 * - Enhanced form validation with real-time feedback
 * - Responsive design with mobile-first approach
 * - Full light/dark mode compatibility using Tailwind dark variants and shadcn variables
 * - Accessibility improvements with ARIA labels and semantic markup
 * - Smooth animations and hover effects for premium user experience
 * - API-driven sidebar navigation items
 * - Rounded content area with card-like appearance
 * - Aligned sidebar and main content headers
 * - Fixed form submission behavior preventing page refresh
 * - Isolated keyboard event handling
 * - Consistent device selection and authentication with Restore.jsx
 * - Step indicator for restore workflow navigation
 *
 * Architecture:
 * - Uses WorkflowContainer for consistent sidebar/main layout
 * - Modular component design for easy maintenance
 * - State management with React hooks
 * - Form validation with visual feedback
 * - CSS-in-JS styling with Tailwind utility classes
 * - API integration for dynamic sidebar content and restore form data
 * - Card-based content layout for improved visual hierarchy
 * - Proper event isolation to prevent conflicts
 * - Integration of DeviceTargetSelector, DeviceAuthFields, and RestoreForm
 * - Step-based navigation for restore with step indicator
 *
 * Dependencies:
 * - @/shared/DeviceTargetSelector: Device selection component
 * - @/shared/DeviceAuthFields: Authentication form component
 * - @/components/ui/tabs: Tab navigation component
 * - @/components/ui/button: Button UI component
 * - lucide-react: Icon library for UI elements
 * - react-spinners/PulseLoader: Loading animations
 * - react-hot-toast: Toast notifications
 * 
 * State Management:
 * - activeTab: Controls sidebar navigation ('backup', 'restore', etc.)
 * - currentTab: Controls main content tabs for restore ('restore', 'execute', 'results')
 * - parameters: Stores form parameters (hostname, backup_file/inventory_file, username, password)
 * - sidebarItems: Navigation items fetched from API
 * - loading: Loading state for API calls (sidebar)
 * - error: Error state for API calls (sidebar)
 * - sidebarCollapsed: Tracks sidebar collapsed state
 * - progress: Tracks execution progress percentage
 * - backupStatus: Tracks backup outcome
 * - restoreStatus: Tracks restore outcome
 * - hosts: List of available host devices from API (for restore)
 * - backups: List of available backup files for selected host (for restore)
 * - loadingHosts: Loading state for hosts fetch (for restore)
 * - loadingBackups: Loading state for backups fetch (for restore)
 * - errorRestore: Error message for API fetches (for restore)
 */
import React, { useState, useEffect } from "react";
import {
  Home,
  Server,
  Database,
  Settings,
  History,
  Download,
  Upload,
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Play,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import DeviceTargetSelector from '@/shared/DeviceTargetSelector';
import DeviceAuthFields from '@/shared/DeviceAuthFields';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PulseLoader from 'react-spinners/PulseLoader';
import toast from 'react-hot-toast';

// =============================================================================
// SECTION 1: CONFIGURATION & CONSTANTS
// =============================================================================
const API_BASE_URL = "http://localhost:3001";

// Animation duration constants for consistent timing
const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleDateString();
};

// =============================================================================
// SECTION 2: MOCK COMPONENTS - Temporary implementations for demonstration
// =============================================================================
// NOTE: In production, these would be imported from their respective modules

/**
 * Mock Tooltip Component
 * Provides hover tooltips for collapsed sidebar items
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child elements
 * @param {string} props.content - Tooltip content
 * @param {string} props.side - Tooltip position (default: 'right')
 * @param {number} props.delayDuration - Delay before showing tooltip
 */
const Tooltip = ({ children, content, side = "right", delayDuration = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setTimeout(() => setIsVisible(true), delayDuration)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-50 px-2 py-1 text-xs bg-popover text-popover-foreground rounded-md shadow-md whitespace-nowrap
          ${side === 'right' ? 'left-full ml-2 top-1/2 -translate-y-1/2' : ''}
          ${side === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' : ''}
          ${side === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : ''}
          ${side === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' : ''}
        `}>
          {content}
          <div className={`absolute w-2 h-2 bg-popover transform rotate-45
            ${side === 'right' ? '-left-1 top-1/2 -translate-y-1/2' : ''}
            ${side === 'left' ? '-right-1 top-1/2 -translate-y-1/2' : ''}
            ${side === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' : ''}
            ${side === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' : ''}
          `} />
        </div>
      )}
    </div>
  );
};

/**
 * Mock TooltipProvider Component
 * Wraps tooltip components for consistent behavior
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child elements
 * @param {number} props.delayDuration - Delay before showing tooltips
 */
const TooltipProvider = ({ children, delayDuration = 150 }) => {
  return <>{children}</>;
};

/**
 * Mock WorkflowContainer Component
 * Provides the main layout structure with sidebar and content area
 * In production: import { WorkflowContainer } from "@/shared/WorkflowContainer"
 * UPDATE (v3.2.0): Enhanced layout with better content area styling and header alignment
 * UPDATE (v3.6.1): Changed dark mode background to black (dark:bg-black)
 * UPDATE (v3.6.6): Fixed header alignment with consistent vertical centering
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.sidebarContent - Sidebar content
 * @param {React.ReactNode} props.sidebarHeader - Sidebar header content
 * @param {React.ReactNode} props.mainContent - Main content area
 * @param {React.ReactNode} props.headerContent - Header content
 * @param {Function} props.onSidebarToggle - Callback for sidebar toggle
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.isCollapsed - Sidebar collapsed state
 * @param {Function} props.onHeaderToggle - Callback for header toggle
 */
const WorkflowContainer = ({
  sidebarContent,
  sidebarHeader,
  mainContent,
  headerContent,
  onSidebarToggle,
  className,
  isCollapsed,
  onHeaderToggle
}) => {
  return (
    <TooltipProvider>
      <div className={`flex h-screen bg-background text-foreground dark:bg-black ${className}`}>
        {/* Sidebar - UPDATED (v3.2.0): Removed individual rounded corners */}
        <div className={`${isCollapsed ? 'w-16' : 'w-72'} border-r border-border dark:border-gray-700 bg-card dark:bg-black transition-all duration-300 flex flex-col overflow-hidden`}>
          {/* Sidebar Header - UPDATED (v3.6.6): Fixed height and alignment for consistency */}
          <div className="h-16 border-b border-border dark:border-gray-700 flex items-center">
            {sidebarHeader}
          </div>
          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {React.cloneElement(sidebarContent, { isCollapsed })}
          </div>
        </div>

        {/* Main Content Area - UPDATED (v3.2.0): Removed rounded corners from container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - UPDATED (v3.6.6): Fixed height matching sidebar header with consistent alignment */}
          {headerContent && (
            <header className="h-16 border-b border-border dark:border-gray-700 bg-background dark:bg-black px-6 flex items-center">
              {React.cloneElement(headerContent, { isCollapsed, onHeaderToggle })}
            </header>
          )}
          {/* Main content area - UPDATED (v3.2.0): Added wrapper with padding and rounded inner container */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="h-full overflow-y-auto bg-card dark:bg-black rounded-2xl border border-border/50 dark:border-gray-700/50">
              {mainContent}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

/**
 * Mock NavigationItem Component
 * Renders sidebar navigation items with icons and labels
 * In production: import { NavigationItem } from "@/shared/NavigationItem"
 * @param {Object} props - Component props
 * @param {React.Component} props.icon - Icon component
 * @param {string} props.label - Navigation item label
 * @param {string} props.description - Navigation item description
 * @param {boolean} props.isActive - Active state
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.isCollapsed - Sidebar collapsed state
 */
const NavigationItem = ({ icon: Icon, label, description, isActive, onClick, isCollapsed }) => {
  const content = (
    <button
      onClick={onClick}
      className={`w-full ${isCollapsed ? 'p-3' : 'p-3'} rounded-lg text-left transition-all duration-200 group ${
        isActive
          ? 'bg-primary dark:bg-gray-700 text-primary-foreground dark:text-gray-100 shadow-sm'
          : 'hover:bg-muted dark:hover:bg-gray-700 text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-100'
      }`}
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">{label}</div>
            {description && (
              <div className="text-xs opacity-70 truncate">{description}</div>
            )}
          </div>
        )}
      </div>
    </button>
  );

  // Wrap with tooltip when collapsed
  if (isCollapsed) {
    return (
      <Tooltip content={label} side="right">
        {content}
      </Tooltip>
    );
  }

  return content;
};

// =============================================================================
// SECTION 3: RESTORE FORM COMPONENT
// =============================================================================
/**
 * RestoreForm Component
 * Enhanced form for selecting host devices and backup files for restoration
 * Adapted from RestoreForm.jsx with light/dark mode compatibility
 * UPDATE (v3.6.1): Changed dark mode background to black (dark:bg-black)
 * @param {Object} props - Component props
 * @param {Object} props.parameters - Form parameters (hostname, backup_file, username, password)
 * @param {Function} props.onParamChange - Handler for parameter changes
 * @param {Array} props.hosts - List of host devices
 * @param {Array} props.backups - List of backup files
 * @param {boolean} props.loadingHosts - Loading state for hosts
 * @param {boolean} props.loadingBackups - Loading state for backups
 * @param {string|null} props.error - Error message for API fetches
 */
const RestoreForm = ({ parameters, onParamChange, hosts, backups, loadingHosts, loadingBackups, error }) => {
  // Icon Components for Dropdowns
  const HostIcon = (
    <svg fill="currentColor" viewBox="0 0 24 24" stroke="none">
      <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"/>
    </svg>
  );

  const BackupIcon = (
    <svg fill="currentColor" viewBox="0 0 24 24" stroke="none">
      <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h16v12H4V4zm2 2v8h12V6H6zm2 2h8v4H8V8z"/>
    </svg>
  );

  const RestoreIcon = (
    <svg fill="currentColor" viewBox="0 0 24 24" stroke="none">
      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12"/>
    </svg>
  );

  // Modern Dropdown Component for Host and Backup Selection
  const ModernDropdown = ({
    label,
    value,
    onChange,
    options = [],
    placeholder,
    disabled = false,
    loading = false,
    icon
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    };

    const handleKeyDown = (e) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleSelect(filteredOptions[focusedIndex].value);
          }
          break;
      }
    };

    return (
      <div className="relative group">
        <label className="block text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 tracking-wide uppercase">
          {label}
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            className={`
              w-full px-6 py-4 text-left bg-white/70 dark:bg-black/70 backdrop-blur-sm border-2 rounded-2xl
              shadow-lg transition-all duration-${ANIMATION_DURATION.normal} group-hover:shadow-xl
              ${disabled || loading
                ? 'border-gray-300 dark:border-gray-600 bg-gray-50/70 dark:bg-black/70 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-900 dark:hover:border-gray-100 focus:ring-4 focus:ring-gray-900/20 dark:focus:ring-gray-100/20 focus:border-gray-900 dark:focus:border-gray-100'
              }
              ${isOpen ? 'ring-4 ring-gray-900/20 dark:ring-gray-100/20 border-gray-900 dark:border-gray-100 shadow-xl' : ''}
            `}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label={label}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {icon && (
                  <div className="text-gray-900 dark:text-gray-100 opacity-80">
                    {React.cloneElement(icon, { className: "w-5 h-5" })}
                  </div>
                )}
                <span className={`font-medium ${selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                  {loading ? (
                    <div className="flex items-center space-x-3">
                      <PulseLoader size={6} color="#111827" className="dark:text-gray-100" />
                      <span className="text-sm">Loading options...</span>
                    </div>
                  ) : (
                    selectedOption?.label || placeholder
                  )}
                </span>
              </div>
              {!loading && (
                <svg
                  className={`w-5 h-5 text-gray-900 dark:text-gray-100 transition-transform duration-${ANIMATION_DURATION.normal} ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </button>
          {isOpen && (
            <div className="absolute z-10 w-full mt-2 bg-white/90 dark:bg-black/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
              <div className="p-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-gray-100/20"
                />
              </div>
              {filteredOptions.length === 0 && !loading ? (
                <div className="p-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                  No options available
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`
                      w-full px-4 py-2 text-left text-sm transition-colors duration-${ANIMATION_DURATION.fast}
                      ${index === focusedIndex
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-black/50'
                      }
                    `}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{option.description}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-fit bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-black dark:via-black dark:to-black p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-2xl p-6 mb-6">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 dark:text-red-200 font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Authentication Section */}
        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          <DeviceAuthFields parameters={parameters} onParamChange={onParamChange} />
        </div>

        {/* Main Form Section */}
        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-2 bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 rounded-xl">
              {React.cloneElement(RestoreIcon, { className: "w-5 h-5 text-white dark:text-gray-900" })}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Select Backup Source</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Choose your device and backup file to restore</p>
            </div>
          </div>

          {/* Form fields in responsive grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Host Selection Dropdown */}
            <ModernDropdown
              label="Host Device"
              value={parameters.hostname || ""}
              onChange={(value) => onParamChange("hostname", value)}
              options={hosts}
              placeholder="Select a host device..."
              loading={loadingHosts}
              icon={HostIcon}
            />

            {/* Backup File Selection Dropdown */}
            <ModernDropdown
              label="Backup File"
              value={parameters.backup_file || ""}
              onChange={(value) => onParamChange("backup_file", value)}
              options={backups}
              placeholder={
                !parameters.hostname
                  ? "Select a host first..."
                  : backups.length === 0
                    ? "No backups available"
                    : "Choose a backup file..."
              }
              disabled={!parameters.hostname || backups.length === 0}
              loading={loadingBackups}
              icon={BackupIcon}
            />
          </div>

          {/* Progress indicator */}
          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${parameters.hostname ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            <div className="w-6 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${parameters.backup_file ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            <div className="w-6 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${parameters.hostname && parameters.backup_file ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
          </div>
        </div>

        {/* Custom scrollbar styles */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-track {
            background: #000000;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #4b5563;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: 6b7280;
          }
        `}</style>
      </div>
    </div>
  );
};

// =============================================================================
// SECTION 4: MAIN BACKUP COMPONENT - Primary page component
// =============================================================================
/**
 * Modern Backup Page Component
 * Orchestrates the backup and restore interfaces with a sidebar and tabbed content
 * UPDATE (v3.3.0): Fixed form submission issues throughout
 * UPDATE (v3.4.0): Added keyboard event debugging and isolation
 * UPDATE (v3.4.1): Integrated DeviceTargetSelector and DeviceAuthFields for consistency with Restore.jsx
 * UPDATE (v3.4.2): Ensured DeviceTargetSelector and DeviceAuthFields prevent page refreshes on input
 * UPDATE (v3.5.0): Replaced MultiTabInterface with step-based navigation to fix input issues
 * UPDATE (v3.6.0): Added tab-based navigation for Restore Device with Restore, Execute, Results tabs
 * UPDATE (v3.6.1): Fixed dark mode background to black (dark:bg-black); corrected duplicate sidebar entries
 * UPDATE (v3.6.2): Removed fallback sidebar items in fetchSidebarItems
 * UPDATE (v3.6.3): Removed "Device Configuration Restore Tool" title; fixed duplicate tab panels in restore
 * UPDATE (v3.6.4): Removed <TabsList> from restore tab, keeping step indicator and programmatic navigation
 * UPDATE (v3.6.5): Updated backup API integration to use new endpoints and data mapping
 * UPDATE (v3.6.6): Fixed header alignment between sidebar and main content
 *
 * Architecture:
 * - Uses WorkflowContainer for consistent sidebar/main layout
 * - Manages global state for form parameters, tabs, and API data
 * - Provides tab-based interface for backup and restore operations
 * - Handles form validation, user interactions, and API integration
 * - Ensures light/dark mode compatibility with Tailwind and shadcn
 *
 * State Management:
 * - activeTab: Controls sidebar navigation ('backup', 'restore', etc.)
 * - currentTab: Controls main content tabs for restore ('restore', 'execute', 'results')
 * - parameters: Stores form parameters (hostname, backup_file/inventory_file, username, password)
 * - sidebarItems: Navigation items fetched from API
 * - loading: Loading state for sidebar API calls
 * - error: Error state for sidebar API calls
 * - sidebarCollapsed: Tracks sidebar collapsed state
 * - progress: Tracks execution progress percentage
 * - backupStatus: Tracks backup outcome
 * - restoreStatus: Tracks restore outcome
 * - hosts: List of available host devices from API (for restore)
 * - backups: List of available backup files for selected host (for restore)
 * - loadingHosts: Loading state for hosts fetch (for restore)
 * - loadingBackups: Loading state for backups fetch (for restore)
 * - errorRestore: Error message for API fetches (for restore)
 *
 * Features:
 * - Real-time form validation
 * - Responsive design with mobile support
 * - Light/dark mode compatibility
 * - Smooth animations and transitions
 * - API-driven sidebar and restore form content
 * - Rounded content area with card-like appearance
 * - Aligned headers for better visual consistency
 * - Form submission prevention
 * - Isolated keyboard event handling
 * - Consistent device selection and authentication
 * - Step-based navigation for restore with step indicator
 */
function ModernBackup() {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState("backup");
  const [currentTab, setCurrentTab] = useState("restore");
  const [parameters, setParameters] = useState({
    hostname: '',
    inventory_file: '',
    username: '',
    password: '',
    backup_file: ''
  });
  const [sidebarItems, setSidebarItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backupStatus, setBackupStatus] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [errorRestore, setErrorRestore] = useState(null);

  // --- Event Handlers ---
  /**
   * Handles parameter changes for backup and restore forms
   * @param {string} name - Parameter name
   * @param {string} value - Parameter value
   */
  const handleParamChange = (name, value) => {
    console.log(`Param update: ${name}: ${value}`); // Debug log
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Toggles sidebar collapsed state
   * @param {boolean} collapsed - New collapsed state
   */
  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  /**
   * Toggles sidebar via header button
   */
  const handleHeaderToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  /**
   * Initiates the backup process
   * Transitions to Execute step and simulates backup progress
   */
  const handleBackup = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setBackupStatus('success');
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  /**
   * Initiates the restore process
   * Transitions to Execute tab and simulates restore progress
   */
  const handleRestore = () => {
    setCurrentTab('execute');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setRestoreStatus('success');
          setCurrentTab('results');
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  /**
   * Resets the backup or restore form to initial state
   * Clears inputs and returns to initial step/tab
   */
  const handleReset = () => {
    if (activeTab === 'backup') {
      setParameters({ hostname: '', inventory_file: '', username: '', password: '', backup_file: '' });
      setBackupStatus(null);
      setProgress(0);
    } else if (activeTab === 'restore') {
      setCurrentTab('restore');
      setRestoreStatus(null);
      setParameters({ hostname: '', inventory_file: '', username: '', password: '', backup_file: '' });
      setProgress(0);
    }
  };

  // --- Validation Logic ---
  const isBackupValid = (
    parameters.hostname?.trim().length > 0 ||
    parameters.inventory_file?.trim().length > 0
  ) && parameters.username?.trim().length > 0 && parameters.password?.trim().length > 0;

  const isRestoreValid = (
    parameters.hostname?.trim().length > 0 &&
    parameters.backup_file?.trim().length > 0 &&
    parameters.username?.trim().length > 0 &&
    parameters.password?.trim().length > 0
  );

  // --- API Integration ---
  /**
   * Fetches sidebar navigation items from API
   * UPDATE (v3.6.1): Removed mock data concatenation to prevent duplicate entries
   * UPDATE (v3.6.2): Removed fallback sidebar items, relying solely on API response
   */
  useEffect(() => {
    const fetchSidebarItems = async () => {
      try {
        setLoading(true);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const url = '/api/sidebar/backup';
        console.log('Fetching sidebar items from:', url);
        console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

        let response = await fetch(url);

        if (response.headers.get('content-type')?.includes('text/html')) {
          console.warn('Proxy failed, falling back to absolute URL:', `${apiBaseUrl}/api/sidebar/backup`);
          response = await fetch(`${apiBaseUrl}/api/sidebar/backup`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Received non-JSON response:', text.substring(0, 200));
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Sidebar items fetched successfully:', data);
        setSidebarItems(data || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch sidebar items:', err);
        setError(err.message);
        setSidebarItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSidebarItems();
  }, []);

  /**
   * Fetches host devices for restore form
   */
  useEffect(() => {
    if (activeTab !== 'restore') return;
    const fetchHosts = async () => {
      setLoadingHosts(true);
      setErrorRestore(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/backups/devices`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Map the API response to the expected format
        const hostOptions = data.devices.map(device => ({
          value: device.name, // Use device.name from the API response
          label: device.name,
          description: `Backups: ${device.backup_count || 0}`
        }));
        setHosts(hostOptions);
        
      } catch (error) {
        console.error('Error fetching hosts:', error);
        setErrorRestore('Failed to load host devices');
        toast.error("Unable to fetch host devices. Please check your connection.");
      } finally {
        setLoadingHosts(false);
      }
    };
    fetchHosts();
  }, [activeTab]);

  /**
   * Fetches backup files when a host is selected
   */
  useEffect(() => {
    if (activeTab !== 'restore') return;
    const fetchBackups = async () => {
      const selectedHost = parameters.hostname;
      if (!selectedHost) {
        setBackups([]);
        setParameters(prev => ({ ...prev, backup_file: '' }));
        return;
      }
      setLoadingBackups(true);
      setErrorRestore(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/backups/device/${selectedHost}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Map the API response to the expected format
        const backupOptions = data.backups.map(backup => ({
          value: backup.name, // Use backup.name from the API response
          label: backup.name,
          description: `Size: ${formatFileSize(backup.size)} • Modified: ${formatTimestamp(backup.modified)}`
        }));
        setBackups(backupOptions);
        
      } catch (error) {
        console.error('Error fetching backups:', error);
        setErrorRestore('Failed to load backup files');
        setBackups([]);
        toast.error("Unable to fetch backup files. Please try again.");
      } finally {
        setLoadingBackups(false);
      }
    };
    fetchBackups();
  }, [activeTab, parameters.hostname]);

  /**
   * Debug logging for parameter changes
   */
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Backup parameters updated:", parameters);
    }
  }, [parameters]);

  // --- Global Keyboard Event Debugging ---
  /**
   * Prevents unintended form submissions and logs keypresses for debugging
   */
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key.toLowerCase() === 'a' && document.activeElement.tagName === 'INPUT') {
        console.log('[DEBUG] A key pressed in input:', {
          key: e.key,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          target: e.target,
          targetName: e.target.name,
          defaultPrevented: e.defaultPrevented
        });
      }

      if (document.activeElement &&
          (document.activeElement.tagName === 'INPUT' ||
           document.activeElement.tagName === 'SELECT' ||
           document.activeElement.tagName === 'TEXTAREA')) {
        if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Enter') {
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  // --- Icon Mapping ---
  const iconMap = {
    Download,
    Upload,
    History,
    Settings,
    Server,
    Database,
    Shield,
    User,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    Play,
    CheckCircle,
    Home
  };

  // =============================================================================
  // SECTION 4.1: SIDEBAR CONTENT COMPONENT
  // =============================================================================
  /**
   * Renders sidebar navigation items with loading and error states
   * @param {Object} props - Component props
   * @param {string} props.activeTab - Current active tab
   * @param {Function} props.setActiveTab - Sets active tab
   * @param {boolean} props.isCollapsed - Sidebar collapsed state
   */
  const SidebarContent = ({ activeTab, setActiveTab, isCollapsed }) => {
    if (loading) {
      return (
        <div className="flex flex-col gap-2 p-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="w-full p-3 rounded-lg bg-muted/50 dark:bg-gray-700/50 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-muted dark:bg-gray-600 rounded"></div>
                {!isCollapsed && (
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-3 bg-muted dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-destructive dark:text-red-400">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Failed to load navigation</p>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">API connection error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-3 py-1.5 text-xs bg-muted dark:bg-gray-700 rounded-md hover:bg-muted/80 dark:hover:bg-gray-600 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (sidebarItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground dark:text-gray-400">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="text-sm">No navigation items available</p>
          <p className="text-xs mt-1">Check API endpoint configuration</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 p-4">
        {sidebarItems.map((item) => {
          const IconComponent = iconMap[item.icon] || Settings;
          return (
            <NavigationItem
              key={item.id}
              icon={IconComponent}
              label={item.title || item.label}
              description={item.subtitle || item.description}
              isActive={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              isCollapsed={isCollapsed}
            />
          );
        })}
      </div>
    );
  };

  // =============================================================================
  // SECTION 4.2: HEADER CONTENT COMPONENT
  // =============================================================================
  /**
   * Renders header with toggle button and title
   * UPDATE (v3.6.6): Fixed vertical alignment to match sidebar header
   * @param {Object} props - Component props
   * @param {boolean} props.isCollapsed - Sidebar collapsed state
   * @param {Function} props.onHeaderToggle - Toggle handler
   */
  const HeaderContent = ({ isCollapsed, onHeaderToggle }) => (
    <div className="flex items-center w-full">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onHeaderToggle}
          className="w-6 h-6 bg-card dark:bg-black border border-border dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-accent dark:hover:bg-gray-700 transition-colors z-10"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
        <div className="flex flex-col justify-center"> {/* Added justify-center for vertical alignment */}
          <h1 className="text-lg font-semibold text-foreground dark:text-gray-100 leading-tight"> {/* Removed pt-0.5, added leading-tight */}
            {activeTab === 'backup' ? 'Backup Device' : 'Restore Device'}
          </h1>
        </div>
      </div>
    </div>
  );

  // =============================================================================
  // SECTION 4.3: SIDEBAR HEADER COMPONENT
  // =============================================================================
  /**
   * Renders sidebar header with consistent vertical alignment
   * UPDATE (v3.6.6): Ensured proper vertical centering to match main header
   * @param {Object} props - Component props
   * @param {boolean} props.isCollapsed - Sidebar collapsed state
   */
  const SidebarHeader = ({ isCollapsed }) => (
    <div className={`flex items-center h-full px-4 transition-all duration-300 ${
      isCollapsed ? 'justify-center' : ''
    }`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 dark:bg-gray-700/30 rounded-lg flex-shrink-0">
          <Database className="h-5 w-5 text-primary dark:text-gray-100" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h2 className="font-semibold text-foreground dark:text-gray-100 truncate leading-tight">Operations</h2> {/* Added leading-tight */}
            <p className="text-xs text-muted-foreground dark:text-gray-400 truncate leading-tight mt-0.5">Backups</p> {/* Added leading-tight and mt-0.5 */}
          </div>
        )}
      </div>
    </div>
  );

  // =============================================================================
  // SECTION 4.4: MAIN CONTENT RENDER
  // =============================================================================
  /**
   * Renders main content based on activeTab
   * @returns {React.ReactNode} Content for backup or restore
   */
  const renderMainContent = () => {
    if (activeTab === 'backup') {
      return (
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 px-6">
          </div>
          <div className="mb-6 px-6">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${progress >= (step === 1 ? 0 : step === 2 ? 10 : 100)
                      ? 'bg-primary dark:bg-gray-700 text-primary-foreground dark:text-gray-100'
                      : backupStatus === 'success' && step === 3
                        ? 'bg-green-500 dark:bg-green-600 text-white'
                        : 'bg-muted dark:bg-gray-700 text-muted-foreground dark:text-gray-400'
                    }
                  `}>
                    {backupStatus === 'success' && step <= 3 ? '✓' : step}
                  </div>
                  <span className={`ml-2 text-sm ${
                    progress >= (step === 1 ? 0 : step === 2 ? 10 : 100)
                      ? 'font-medium text-gray-900 dark:text-gray-100'
                      : 'text-muted-foreground dark:text-gray-400'
                  }`}>
                    {step === 1 ? 'Select' : step === 2 ? 'Execute' : 'Results'}
                  </span>
                  {step < 3 && (
                    <div className={`w-12 h-px mx-4 ${
                      progress >= (step === 1 ? 10 : 100) ? 'bg-green-500 dark:bg-green-600' : 'bg-muted dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden bg-card dark:bg-black">
            <div className="space-y-6 p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Device Selection</h3>
                <DeviceTargetSelector 
                  parameters={parameters}
                  onParamChange={handleParamChange}
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Authentication</h3>
                <DeviceAuthFields 
                  parameters={parameters}
                  onParamChange={handleParamChange}
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleBackup}
                  disabled={!isBackupValid}
                  className="bg-primary dark:bg-gray-700 text-primary-foreground dark:text-gray-100 hover:bg-primary/90 dark:hover:bg-gray-600"
                >
                  Start Backup Process
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (activeTab === 'restore') {
      return (
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 px-6">
          </div>
          <div className="mb-6 px-6">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentTab === (step === 1 ? 'restore' : step === 2 ? 'execute' : 'results')
                      ? 'bg-primary dark:bg-gray-700 text-primary-foreground dark:text-gray-100'
                      : restoreStatus === 'success' && step <= 3
                        ? 'bg-green-500 dark:bg-green-600 text-white'
                        : 'bg-muted dark:bg-gray-700 text-muted-foreground dark:text-gray-400'
                    }
                  `}>
                    {restoreStatus === 'success' && step <= 3 ? '✓' : step}
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentTab === (step === 1 ? 'restore' : step === 2 ? 'execute' : 'results')
                      ? 'font-medium text-gray-900 dark:text-gray-100'
                      : 'text-muted-foreground dark:text-gray-400'
                  }`}>
                    {step === 1 ? 'Restore' : step === 2 ? 'Execute' : 'Results'}
                  </span>
                  {step < 3 && (
                    <div className={`w-12 h-px mx-4 ${
                      (step === 1 && currentTab !== 'restore') || (step === 2 && currentTab === 'results')
                        ? 'bg-green-500 dark:bg-green-600'
                        : 'bg-muted dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>


          <Tabs value={currentTab} className="w-full">
            <TabsContent value="restore" className="mt-6">
              <RestoreForm
                parameters={parameters}
                onParamChange={handleParamChange}
                hosts={hosts}
                backups={backups}
                loadingHosts={loadingHosts}
                loadingBackups={loadingBackups}
                error={errorRestore}
              />
              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleRestore}
                  disabled={!isRestoreValid}
                  className="bg-primary dark:bg-gray-700 text-primary-foreground dark:text-gray-100 hover:bg-primary/90 dark:hover:bg-gray-600"
                >
                  Start Restore Process
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="execute" className="mt-6">
              <div className="p-6 space-y-6 bg-card dark:bg-black rounded-lg border border-border dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Restoration in Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span>Restoring device configuration...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary dark:bg-gray-400 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground dark:text-gray-400">
                  <p>Please do not close this window during the restoration process.</p>
                  <p>This may take several minutes to complete.</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="results" className="mt-6">
              <div className="p-6 space-y-6 bg-card dark:bg-black rounded-lg border border-border dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Restoration Results</h3>
                {restoreStatus === 'success' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-800/30">
                          <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-medium text-green-800 dark:text-green-200">Restoration Successful</h4>
                          <p className="mt-1 text-green-700 dark:text-green-300">Device configuration has been successfully restored.</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted dark:bg-gray-700 p-4 rounded-md">
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Details:</h4>
                      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Target:</span>
                          <span>{parameters.hostname || 'Unknown'}</span>
                        </li>
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Backup File:</span>
                          <span>{parameters.backup_file || 'Unknown'}</span>
                        </li>
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Timestamp:</span>
                          <span>{new Date().toLocaleString()}</span>
                        </li>
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Status:</span>
                          <span className="text-green-600 dark:text-green-400">Completed successfully</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800/30">
                        <svg className="h-6 w-6 text-amber-600 dark:bg-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-medium text-amber-800 dark:text-amber-200">No Results Available</h4>
                        <p className="mt-1 text-amber-700 dark:text-amber-300">Please complete the restoration process to view results.</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleReset}
                    className="bg-primary dark:bg-gray-700 text-primary-foreground dark:text-gray-100 hover:bg-primary/90 dark:hover:bg-gray-600"
                  >
                    Start New Restoration
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-muted dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
              <Settings className="h-8 w-8 text-muted-foreground dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Coming Soon</h3>
            <p className="text-muted-foreground dark:text-gray-400">This section will be implemented in the next iteration</p>
          </div>
        </div>
      );
    }
  };

  // =============================================================================
  // SECTION 4.5: MAIN RENDER SECTION
  // =============================================================================
  return (
    <div className="min-h-screen bg-background text-foreground dark:bg-black">
      <WorkflowContainer
        sidebarContent={
          <SidebarContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={sidebarCollapsed}
          />
        }
        sidebarHeader={
          <SidebarHeader isCollapsed={sidebarCollapsed} />
        }
        headerContent={<HeaderContent />}
        mainContent={renderMainContent()}
        onSidebarToggle={handleSidebarToggle}
        onHeaderToggle={handleHeaderToggle}
        isCollapsed={sidebarCollapsed}
        className="min-h-screen"
      />
    </div>
  );
}

// =============================================================================
// EXPORTS SECTION
// =============================================================================
export default ModernBackup;
