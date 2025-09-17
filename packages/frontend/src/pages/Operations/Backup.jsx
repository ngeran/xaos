/**
 * File Path: src/pages/Operations/Backup.jsx
 * Version: 3.1.5
 *
 * Description:
 * Modern redesigned backup operations page with enhanced UI/UX and three-tab interface.
 * Features glassmorphism design, improved accessibility, and comprehensive light/dark mode support.
 * Uses WorkflowContainer for consistent layout with collapsible sidebar and modern tabbed interface
 * for backup configuration, execution, and results viewing.
 * 
 * NEW: Fetches sidebar navigation items from API endpoint instead of hardcoded values.
 * UPDATE (v3.1.1): Added enhanced API error handling for non-JSON responses and improved sidebar error state display.
 * UPDATE (v3.1.2): Modified fetchSidebarItems to use absolute API URL from environment variable to avoid hitting frontend dev server.
 * UPDATE (v3.1.3): Changed environment variable access from process.env.REACT_APP_API_BASE_URL to import.meta.env.VITE_API_BASE_URL for Vite compatibility.
 * UPDATE (v3.1.4): Switched to relative URL (/api/sidebar/backup) assuming Vite proxy is configured; added debug log for environment variable.
 * UPDATE (v3.1.5): Added fallback to absolute URL if proxy fails; enhanced logging for request URL and response status.
 *
 * Key Features:
 * - Modern glassmorphism design with gradient overlays and backdrop blur
 * - Three-tab interface: Settings, Execution, Results
 * - Enhanced form validation with real-time feedback
 * - Responsive design with mobile-first approach
 * - Full light/dark mode compatibility using CSS custom properties
 * - Accessibility improvements with ARIA labels and semantic markup
 * - Smooth animations and hover effects for premium user experience
 * - API-driven sidebar navigation items
 *
 * Architecture:
 * - Uses WorkflowContainer for consistent sidebar/main layout
 * - Modular component design for easy maintenance
 * - State management with React hooks
 * - Form validation with visual feedback
 * - CSS-in-JS styling with Tailwind utility classes
 * - API integration for dynamic sidebar content
 *
 * How-To Guide:
 *
 * Basic Usage:
 * ```jsx
 * import ModernBackup from '@/pages/Operations/Backup';
 *
 * function App() {
 *   return <ModernBackup />;
 * }
 * ```
 *
 * With Theme Integration:
 * ```jsx
 * import ModernBackup from '@/pages/Operations/Backup';
 * import { ThemeProvider } from '@/contexts/ThemeContext';
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <div className="min-h-screen bg-background text-foreground">
 *         <ModernBackup />
 *       </div>
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */

// =============================================================================
// IMPORTS SECTION - Dependencies and external libraries
// =============================================================================
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

// =============================================================================
// SECTION 1: MOCK COMPONENTS - Temporary implementations for demonstration
// =============================================================================
// NOTE: In production, these would be imported from their respective modules

/**
 * Mock Tooltip Component
 * Provides hover tooltips for collapsed sidebar items
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
 */
const TooltipProvider = ({ children, delayDuration = 150 }) => {
  return <>{children}</>;
};

/**
 * Mock WorkflowContainer Component
 * Provides the main layout structure with sidebar and content area
 * In production: import { WorkflowContainer } from "@/shared/WorkflowContainer"
 */
const WorkflowContainer = ({
  sidebarContent,
  sidebarHeader,
  headerContent,
  mainContent,
  onSidebarToggle,
  className,
  isCollapsed,
  onHeaderToggle
}) => {
  return (
    <TooltipProvider>
      <div className={`flex h-screen bg-background text-foreground ${className}`}>
        {/* Sidebar with rounded corners */}
        <div className={`${isCollapsed ? 'w-16' : 'w-72'} border-r border-border bg-card transition-all duration-300 flex flex-col overflow-hidden rounded-r-2xl`}>
          {/* Sidebar Header with aligned content */}
          <div className="relative">
            {sidebarHeader}
          </div>
          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {React.cloneElement(sidebarContent, { isCollapsed })}
          </div>
        </div>

        {/* Main Content Area with rounded corners */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-l-2xl ml-1">
          {/* Header with proper alignment */}
          {headerContent && (
            <header className="h-16 border-b border-border bg-background px-6 flex items-center rounded-tl-2xl">
              {React.cloneElement(headerContent, { isCollapsed, onHeaderToggle })}
            </header>
          )}
          {/* Main content area with rounded bottom left corner */}
          <div className="flex-1 overflow-y-auto bg-muted/40 rounded-bl-2xl">
            {mainContent}
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
 */
const NavigationItem = ({ icon: Icon, label, description, isActive, onClick, isCollapsed }) => {
  const content = (
    <button
      onClick={onClick}
      className={`w-full ${isCollapsed ? 'p-3' : 'p-3'} rounded-lg text-left transition-all duration-200 group ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
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
// SECTION 2: ENHANCED FORM COMPONENTS - Modern redesigned components
// =============================================================================

/**
 * Modern Device Target Selector Component
 * Enhanced version of DeviceTargetSelector with glassmorphism design
 *
 * Features:
 * - Gradient background with backdrop blur
 * - Success indicator when device is selected
 * - Enhanced validation with real-time feedback
 * - Improved typography and spacing
 * - Responsive design for all screen sizes
 *
 * @param {Object} parameters - Form parameters object
 * @param {Function} onParamChange - Callback for parameter changes
 * @param {Array} devices - Array of available devices
 * @param {string} title - Component title
 * @param {string} description - Component description
 */
const ModernDeviceTargetSelector = ({
  parameters = {},
  onParamChange = () => {},
  devices = [],
  title = "Target Device",
  description = "Select the device to backup"
}) => {
  // --- Validation Logic ---
  // Checks if target device selection is valid
  const isTargetValid = parameters.target?.trim().length > 0;

  // --- Event Handlers ---
  // Handles dropdown selection change
  const handleChange = (e) => {
    onParamChange("target", e.target.value);
  };

  // --- Render Section ---
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-card backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-accent/[0.02]" />

      {/* HEADER SECTION - Component title and status indicator */}
      <div className="relative px-6 py-5 border-b border-border/50">
        <div className="flex items-start gap-4">
          {/* Icon Container */}
          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Server className="h-5 w-5 text-primary" />
          </div>
          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          {/* Success Indicator */}
          {isTargetValid && (
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          )}
        </div>
      </div>

      {/* CONTENT SECTION - Form fields and validation */}
      <div className="relative p-6">
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground block">
            Device Selection
          </label>
          <div className="relative">
            <select
              name="target"
              value={parameters.target || ""}
              onChange={handleChange}
              className={`
                w-full pl-12 pr-4 py-3.5 text-sm rounded-xl border transition-all duration-200
                bg-background/50 backdrop-blur-sm
                focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring
                hover:border-muted-foreground/50
                ${isTargetValid
                  ? "border-border shadow-sm"
                  : "border-destructive/50 bg-destructive/5 focus:ring-destructive/20"
                }
              `}
            >
              <option value="">Choose a target device...</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
            <Server className={`absolute left-4 top-3.5 h-4 w-4 transition-colors ${
              isTargetValid ? "text-muted-foreground" : "text-destructive"
            }`} />
          </div>
          {!isTargetValid && (
            <div className="flex items-center gap-2 text-xs text-destructive animate-in fade-in duration-200">
              <AlertCircle className="h-3 w-3" />
              Please select a target device to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Modern Single Device Authentication Component
 * Enhanced version with improved UX and modern design patterns
 *
 * Features:
 * - Glassmorphism design with gradient backgrounds
 * - Real-time validation with visual feedback
 * - Password visibility toggle with smooth transitions
 * - Responsive grid layout (stacked on mobile, side-by-side on desktop)
 * - Status indicator showing completion state
 * - Enhanced accessibility with proper ARIA labels
 *
 * @param {Object} parameters - Authentication parameters
 * @param {Function} onParamChange - Parameter change callback
 * @param {string} title - Component title
 * @param {string} description - Component description
 */
const ModernSingleDeviceAuth = ({
  parameters = {},
  onParamChange = () => {},
  title = "Authentication",
  description = "Provide device credentials for secure access"
}) => {
  // --- State Management ---
  // Controls password field visibility
  const [showPassword, setShowPassword] = useState(false);

  // --- Event Handlers ---
  // Generic handler for all input field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    onParamChange(name, value);
  };

  // --- Validation Logic ---
  // Individual field validation states
  const hasValidHostname = parameters.hostname?.trim().length > 0;
  const hasValidUsername = parameters.username?.trim().length > 0;
  const hasValidPassword = parameters.password?.trim().length > 0;
  const allValid = hasValidHostname && hasValidUsername && hasValidPassword;

  // --- Render Section ---
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-card backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-500/[0.02]" />

      {/* HEADER SECTION - Title, description, and status */}
      <div className="relative px-6 py-5 border-b border-border/50">
        <div className="flex items-start gap-4">
          {/* Security Icon */}
          <div className="p-2.5 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          {/* Completion Status Badge */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            allValid
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          }`}>
            {allValid ? "Ready" : "Incomplete"}
          </div>
        </div>
      </div>

      {/* FORM FIELDS SECTION - Authentication inputs with validation */}
      <div className="relative p-6 space-y-5">
        {/* HOSTNAME FIELD - Primary connection target */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block">
            Hostname / IP Address
          </label>
          <div className="relative">
            <input
              type="text"
              name="hostname"
              value={parameters.hostname || ""}
              onChange={handleChange}
              placeholder="e.g., 192.168.1.1 or router.local"
              className={`w-full pl-12 pr-4 py-3.5 text-sm rounded-xl border transition-all duration-200 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 hover:border-muted-foreground/50 ${
                hasValidHostname
                  ? "border-border focus:ring-ring/20 focus:border-ring"
                  : "border-destructive/50 bg-destructive/5 focus:ring-destructive/20"
              }`}
            />
            <Server className={`absolute left-4 top-3.5 h-4 w-4 transition-colors ${
              hasValidHostname ? "text-muted-foreground" : "text-destructive"
            }`} />
          </div>
          {/* Validation Error Message */}
          {!hasValidHostname && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              Hostname or IP address is required
            </div>
          )}
        </div>

        {/* CREDENTIALS GRID - Username and Password side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* USERNAME FIELD */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                name="username"
                value={parameters.username || ""}
                onChange={handleChange}
                placeholder="admin"
                className={`w-full pl-12 pr-4 py-3.5 text-sm rounded-xl border transition-all duration-200 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 hover:border-muted-foreground/50 ${
                  hasValidUsername
                    ? "border-border focus:ring-ring/20 focus:border-ring"
                    : "border-destructive/50 bg-destructive/5 focus:ring-destructive/20"
                }`}
              />
              <User className={`absolute left-4 top-3.5 h-4 w-4 transition-colors ${
                hasValidUsername ? "text-muted-foreground" : "text-destructive"
              }`} />
            </div>
            {/* Username Validation */}
            {!hasValidUsername && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                Username required
              </div>
            )}
          </div>

          {/* PASSWORD FIELD with visibility toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={parameters.password || ""}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full pl-12 pr-12 py-3.5 text-sm rounded-xl border transition-all duration-200 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 hover:border-muted-foreground/50 ${
                  hasValidPassword
                    ? "border-border focus:ring-ring/20 focus:border-ring"
                    : "border-destructive/50 bg-destructive/5 focus:ring-destructive/20"
                }`}
              />
              <Lock className={`absolute left-4 top-3.5 h-4 w-4 transition-colors ${
                hasValidPassword ? "text-muted-foreground" : "text-destructive"
              }`} />
              {/* Password Visibility Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Password Validation */}
            {!hasValidPassword && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                Password required
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SECTION 3: ACTION COMPONENTS - Interactive elements
// =============================================================================

/**
 * Modern Execute Button Component
 * Primary action button with enhanced visual feedback and disabled states
 *
 * Features:
 * - Disabled state when form is incomplete
 * - Hover effects with subtle lift animation
 * - Gradient overlay on hover for premium feel
 * - Proper accessibility with disabled cursor states
 *
 * @param {boolean} disabled - Whether button should be disabled
 * @param {Function} onExecute - Click handler for execution
 */
const ExecuteButton = ({ disabled, onExecute }) => (
  <div className="flex justify-end">
    <button
      onClick={onExecute}
      disabled={disabled}
      className={`group relative px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
        disabled
          ? "bg-muted text-muted-foreground cursor-not-allowed"
          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
      }`}
    >
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4" />
        Execute Backup
      </div>
      {!disabled && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      )}
    </button>
  </div>
);

/**
 * Tab Navigation Button Component
 * Individual tab button with icon and active states
 *
 * @param {boolean} isActive - Whether tab is currently active
 * @param {Function} onClick - Tab click handler
 * @param {ReactNode} children - Tab label text
 * @param {Component} icon - Lucide icon component
 */
const TabButton = ({ isActive, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`}
  >
    <Icon className="h-4 w-4" />
    {children}
  </button>
);

// =============================================================================
// SECTION 4: MAIN BACKUP COMPONENT - Primary page component
// =============================================================================

/**
 * Modern Backup Page Component
 * Main component orchestrating the entire backup interface
 *
 * Architecture:
 * - Uses WorkflowContainer for consistent sidebar/main layout
 * - Manages global state for form parameters and active tabs
 * - Provides three-tab interface: Settings, Execution, Results
 * - Handles form validation and user interactions
 * - Fetches sidebar navigation items from API
 *
 * State Management:
 * - activeTab: Controls sidebar navigation
 * - backupTab: Controls main content tabs (settings/execution/results)
 * - parameters: Form data for device selection and authentication
 * - sidebarItems: Navigation items fetched from API
 * - loading: Loading state for API calls
 * - error: Error state for API calls
 *
 * Features:
 * - Real-time form validation
 * - Responsive design with mobile support
 * - Light/dark mode compatibility
 * - Smooth animations and transitions
 * - API-driven sidebar content
 */
function ModernBackup() {
  // --- State Management ---
  // Controls which sidebar item is active
  const [activeTab, setActiveTab] = useState("backup");
  // Controls which backup sub-tab is active (settings/execution/results)
  const [backupTab, setBackupTab] = useState("settings");
  // Stores form parameters for device selection and authentication
  const [parameters, setParameters] = useState({});
  // Controls sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Stores sidebar navigation items fetched from API
  const [sidebarItems, setSidebarItems] = useState([]);
  // Loading state for API calls
  const [loading, setLoading] = useState(true);
  // Error state for API calls
  const [error, setError] = useState(null);

  // --- Event Handlers ---
  // Updates form parameters when user inputs change
  const handleParamChange = (name, value) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  // Toggles sidebar collapsed state
  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  // Toggles sidebar collapsed state from header
  const handleHeaderToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // --- API Integration ---
  // Fetch sidebar navigation items from API
  useEffect(() => {
    const fetchSidebarItems = async () => {
      try {
        setLoading(true);
        // Debug: Log environment variable and request URL
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const url = '/api/sidebar/backup'; // Prefer relative URL with Vite proxy
        console.log('Fetching sidebar items from:', url);
        console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
        
        let response = await fetch(url);
        
        // Fallback to absolute URL if proxy fails (e.g., returns HTML)
        if (response.headers.get('content-type')?.includes('text/html')) {
          console.warn('Proxy failed, falling back to absolute URL:', `${apiBaseUrl}/api/sidebar/backup`);
          response = await fetch(`${apiBaseUrl}/api/sidebar/backup`);
        }
        
        // Check if response is HTML (indicating an error page)
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
        setSidebarItems(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch sidebar items:', err);
        setError(err.message);
        // Keep sidebarItems empty to show error state
        setSidebarItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSidebarItems();
  }, []);

  // --- Mock Data ---
  // Available devices for selection (in production, this would come from an API)
  const devices = [
    { id: "router-1", name: "Core Router (10.0.0.1)" },
    { id: "switch-1", name: "Access Switch (10.0.0.2)" },
    { id: "firewall-1", name: "Perimeter Firewall (10.0.0.3)" }
  ];

  // --- Validation Logic ---
  // Determines if all required fields are filled for execution
  const isReadyToExecute = parameters.target && parameters.hostname &&
                          parameters.username && parameters.password;

  // --- Icon Mapping ---
  // Maps icon names from API to Lucide React components
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
   * Sidebar Navigation Content
   * Renders navigation items fetched from API
   * UPDATE (v3.1.1): Added enhanced error handling with retry button and specific error messaging
   */
  const SidebarContent = ({ activeTab, setActiveTab, isCollapsed }) => {
    if (loading) {
      return (
        <div className="flex flex-col gap-2 p-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="w-full p-3 rounded-lg bg-muted/50 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-muted rounded"></div>
                {!isCollapsed && (
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Show error state if API call failed
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Failed to load navigation</p>
          <p className="text-xs text-muted-foreground mt-1">API connection error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-3 py-1.5 text-xs bg-muted rounded-md hover:bg-muted/80 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    // Show empty state if no sidebar items are available
    if (sidebarItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
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
   * Dynamic Header Content
   * Updates title and description based on current context
   */
  const HeaderContent = ({ isCollapsed, onHeaderToggle }) => (
    <div className="flex items-center w-full">
      {/* Collapse Toggle Button and Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onHeaderToggle}
          className="w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center hover:bg-accent transition-colors z-10"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        {/* Page Title - Smaller and next to the button */}
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-foreground pt-0.5">Backup Device</h1>
          <p className="text-xs text-muted-foreground">Create a backup of your device configuration</p>
        </div>
      </div>
    </div>
  );

  // =============================================================================
  // SECTION 4.3: TAB CONTENT COMPONENTS
  // =============================================================================
  /**
   * Main Backup Tab Content
   * Contains the three-tab interface for Settings, Execution, and Results
   */
  const BackupTabContent = () => (
    <div className="p-8 space-y-8">
      {/* SUB-TAB NAVIGATION - Settings, Execution, Results */}
      <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-xl w-fit mx-auto">
        <TabButton
          isActive={backupTab === "settings"}
          onClick={() => setBackupTab("settings")}
          icon={Settings}
        >
          Settings
        </TabButton>
        <TabButton
          isActive={backupTab === "execution"}
          onClick={() => setBackupTab("execution")}
          icon={Play}
        >
          Execution
        </TabButton>
        <TabButton
          isActive={backupTab === "results"}
          onClick={() => setBackupTab("results")}
          icon={Database}
        >
          Results
        </TabButton>
      </div>

      {/* DYNAMIC TAB CONTENT - Changes based on active tab */}
      {/* SETTINGS TAB - Device selection, authentication, and execute button */}
      {backupTab === "settings" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Device Target Selection */}
          <ModernDeviceTargetSelector
            parameters={parameters}
            onParamChange={handleParamChange}
            devices={devices}
          />

          {/* Device Authentication */}
          <ModernSingleDeviceAuth
            parameters={parameters}
            onParamChange={handleParamChange}
          />

          {/* Execute Button Section */}
          <div className="pt-4 border-t border-border/50">
            <ExecuteButton
              disabled={!isReadyToExecute}
              onExecute={() => {
                console.log("Executing backup with parameters:", parameters);
                setBackupTab("execution");
              }}
            />
          </div>
        </div>
      )}

      {/* EXECUTION TAB - Backup process interface (placeholder) */}
      {backupTab === "execution" && (
        <div className="flex items-center justify-center py-16 animate-in fade-in duration-300">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Play className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold">Execution Interface</h3>
            <p className="text-muted-foreground">Backup execution progress and controls will be implemented here</p>
          </div>
        </div>
      )}

      {/* RESULTS TAB - Backup results and logs (placeholder) */}
      {backupTab === "results" && (
        <div className="flex items-center justify-center py-16 animate-in fade-in duration-300">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <Database className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold">Results Dashboard</h3>
            <p className="text-muted-foreground">Backup results, logs, and download options will be displayed here</p>
          </div>
        </div>
      )}
    </div>
  );

  // =============================================================================
  // SECTION 4.4: MAIN RENDER SECTION
  // =============================================================================
  return (
    <div className="min-h-screen bg-background text-foreground">
      <WorkflowContainer
        // Sidebar configuration
        sidebarContent={
          <SidebarContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={sidebarCollapsed}
          />
        }
        sidebarHeader={
          <div className={`flex items-center gap-3 p-4 border-b border-border transition-all duration-300 ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}>
            {/* Sidebar Header Icon and Title */}
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Database className="h-5 w-5 text-primary" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h2 className="font-semibold text-foreground truncate">Backup Operations</h2>
                <p className="text-xs text-muted-foreground truncate">Manage device backups</p>
              </div>
            )}
          </div>
        }
        // Main content area
        headerContent={<HeaderContent />}
        mainContent={
          // Conditional rendering based on active sidebar tab
          activeTab === "backup" ? (
            <BackupTabContent />
          ) : (
            // Placeholder for other sidebar tabs (restore, history, settings)
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Settings className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Coming Soon</h3>
                <p className="text-muted-foreground">This section will be implemented in the next iteration</p>
              </div>
            </div>
          )
        }
        // Event handlers and configuration
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
