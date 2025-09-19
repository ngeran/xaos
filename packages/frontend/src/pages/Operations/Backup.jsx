/**
 * File Path: src/pages/Operations/Backup.jsx
 * Version: 3.5.0
 *
 * Description:
 * Modern redesigned backup operations page with enhanced UI/UX and three-step interface.
 * Features glassmorphism design, improved accessibility, and comprehensive light/dark mode support.
 * Uses WorkflowContainer for consistent layout with collapsible sidebar and a step-based interface
 * for backup configuration, execution, and results viewing.
 *
 * NEW: Fetches sidebar navigation items from API endpoint instead of hardcoded values.
 * UPDATE (v3.1.1): Added enhanced API error handling for non-JSON responses and improved sidebar error state display.
 * UPDATE (v3.1.2): Modified fetchSidebarItems to use absolute API URL from environment variable to avoid hitting frontend dev server.
 * UPDATE (v3.1.3): Changed environment variable access from process.env.REACT_APP_API_BASE_URL to import.meta.env.VITE_API_BASE_URL for Vite compatibility.
 * UPDATE (v3.1.4): Switched to relative URL (/api/sidebar/backup) assuming Vite proxy is configured; added debug log for environment variable.
 * UPDATE (v3.1.5): Added fallback to absolute URL if proxy fails; enhanced logging for request URL and response status.
 * UPDATE (v3.2.0): Enhanced content area with rounded corners and improved header alignment for better visual hierarchy.
 * UPDATE (v3.3.0): Fixed form submission issues causing page refresh by adding proper form wrappers and event handlers.
 * UPDATE (v3.4.0): Added global keyboard event debugging and proper event isolation to prevent page refresh.
 * UPDATE (v3.4.1): Integrated DeviceTargetSelector and DeviceAuthFields for consistency with Restore.jsx.
 * UPDATE (v3.4.2): Ensured DeviceTargetSelector and DeviceAuthFields prevent page refreshes on input by wrapping inputs in forms with proper event handling.
 * UPDATE (v3.5.0): Replaced MultiTabInterface with step-based navigation to align with Restore.jsx, fixing page refresh on input by avoiding tab component remounting issues.
 *
 * Key Features:
 * - Modern glassmorphism design with gradient overlays and backdrop blur
 * - Three-step interface: Settings, Execution, Results
 * - Enhanced form validation with real-time feedback
 * - Responsive design with mobile-first approach
 * - Full light/dark mode compatibility using CSS custom properties
 * - Accessibility improvements with ARIA labels and semantic markup
 * - Smooth animations and hover effects for premium user experience
 * - API-driven sidebar navigation items
 * - Rounded content area with card-like appearance
 * - Aligned sidebar and main content headers
 * - Fixed form submission behavior preventing page refresh
 * - Isolated keyboard event handling
 * - Consistent device selection and authentication with Restore.jsx
 * - Step-based navigation to prevent input field interaction issues
 *
 * Architecture:
 * - Uses WorkflowContainer for consistent sidebar/main layout
 * - Modular component design for easy maintenance
 * - State management with React hooks
 * - Form validation with visual feedback
 * - CSS-in-JS styling with Tailwind utility classes
 * - API integration for dynamic sidebar content
 * - Card-based content layout for improved visual hierarchy
 * - Proper event isolation to prevent conflicts
 * - Integration of DeviceTargetSelector and DeviceAuthFields for device selection and authentication
 * - Step-based navigation to avoid MultiTabInterface issues
 *
 * Dependencies:
 * - @/shared/DeviceTargetSelector: Device selection component
 * - @/shared/DeviceAuthFields: Authentication form component
 * - lucide-react: Icon library for UI elements
 * 
 * State Management:
 * - activeTab: Controls sidebar navigation
 * - currentStep: Controls main content steps (settings/execution/results)
 * - deviceParams: Stores parameters for DeviceTargetSelector
 * - authParams: Holds authentication credentials for DeviceAuthFields
 * - sidebarItems: Navigation items fetched from API
 * - loading: Loading state for API calls
 * - error: Error state for API calls
 * - sidebarCollapsed: Tracks sidebar collapsed state
 * - progress: Tracks execution progress percentage
 * - backupStatus: Tracks backup outcome
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
import { Button } from '@/components/ui/button';

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
 *
 * UPDATE (v3.2.0): Enhanced layout with better content area styling and header alignment
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
      <div className={`flex h-screen bg-background text-foreground ${className}`}>
        {/* Sidebar - UPDATED (v3.2.0): Removed individual rounded corners */}
        <div className={`${isCollapsed ? 'w-16' : 'w-72'} border-r border-border bg-card transition-all duration-300 flex flex-col overflow-hidden`}>
          {/* Sidebar Header - UPDATED (v3.2.0): Fixed height for alignment */}
          <div className="h-16 border-b border-border">
            {sidebarHeader}
          </div>
          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {React.cloneElement(sidebarContent, { isCollapsed })}
          </div>
        </div>

        {/* Main Content Area - UPDATED (v3.2.0): Removed rounded corners from container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - UPDATED (v3.2.0): Fixed height matching sidebar header */}
          {headerContent && (
            <header className="h-16 border-b border-border bg-background px-6 flex items-center">
              {React.cloneElement(headerContent, { isCollapsed, onHeaderToggle })}
            </header>
          )}
          {/* Main content area - UPDATED (v3.2.0): Added wrapper with padding and rounded inner container */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="h-full overflow-y-auto bg-card rounded-2xl border border-border/50">
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
// SECTION 2: MAIN BACKUP COMPONENT - Primary page component
// =============================================================================

/**
 * Modern Backup Page Component
 * Main component orchestrating the entire backup interface
 * UPDATE (v3.3.0): Fixed form submission issues throughout
 * UPDATE (v3.4.0): Added keyboard event debugging and isolation
 * UPDATE (v3.4.1): Integrated DeviceTargetSelector and DeviceAuthFields for consistency with Restore.jsx
 * UPDATE (v3.4.2): Ensured DeviceTargetSelector and DeviceAuthFields prevent page refreshes on input
 * UPDATE (v3.5.0): Replaced MultiTabInterface with step-based navigation to align with Restore.jsx, fixing page refresh on input
 *
 * Architecture:
 * - Uses WorkflowContainer for consistent sidebar/main layout
 * - Manages global state for form parameters and active steps
 * - Provides three-step interface: Settings, Execution, Results
 * - Handles form validation and user interactions
 * - Fetches sidebar navigation items from API
 * - Integrates DeviceTargetSelector and DeviceAuthFields for device selection and authentication
 * - Step-based navigation to prevent input field interaction issues
 *
 * State Management:
 * - activeTab: Controls sidebar navigation
 * - currentStep: Controls main content steps (settings/execution/results)
 * - deviceParams: Stores parameters for DeviceTargetSelector
 * - authParams: Holds authentication credentials for DeviceAuthFields
 * - sidebarItems: Navigation items fetched from API
 * - loading: Loading state for API calls
 * - error: Error state for API calls
 * - sidebarCollapsed: Tracks sidebar collapsed state
 * - progress: Tracks execution progress percentage
 * - backupStatus: Tracks backup outcome
 *
 * Features:
 * - Real-time form validation
 * - Responsive design with mobile support
 * - Light/dark mode compatibility
 * - Smooth animations and transitions
 * - API-driven sidebar content
 * - Rounded content area with card-like appearance
 * - Aligned headers for better visual consistency
 * - Form submission prevention
 * - Isolated keyboard event handling
 * - Consistent device selection and authentication with Restore.jsx
 * - Step-based navigation for stable input handling
 */
function ModernBackup() {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState("backup");
  const [currentStep, setCurrentStep] = useState(1);
  const [deviceParams, setDeviceParams] = useState({
    hostname: '',
    inventory_file: ''
  });
  const [authParams, setAuthParams] = useState({
    username: '',
    password: ''
  });
  const [sidebarItems, setSidebarItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backupStatus, setBackupStatus] = useState(null);

  // --- Event Handlers ---
  const handleDeviceParamChange = (name, value) => {
    console.log(`Device param update: ${name}: ${value}`); // Debug log
    setDeviceParams(prev => ({ ...prev, [name]: value }));
  };

  const handleAuthParamChange = (name, value) => {
    console.log(`Auth param update: ${name}: ${value}`); // Debug log
    setAuthParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  const handleHeaderToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleBackup = () => {
    setCurrentStep(2);
    setProgress(0);

    // Simulate backup process with progress updates
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setBackupStatus('success');
          setCurrentStep(3);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setBackupStatus(null);
    setDeviceParams({ hostname: '', inventory_file: '' });
    setAuthParams({ username: '', password: '' });
    setProgress(0);
  };

  // --- Validation Logic ---
  const isDeviceTargetSelected = (deviceParams.hostname?.trim().length > 0 || deviceParams.inventory_file?.trim().length > 0);
  const areAuthFieldsValid = (authParams.username?.trim().length > 0 && authParams.password?.trim().length > 0);
  const isReadyToExecute = isDeviceTargetSelected && areAuthFieldsValid;

  // --- API Integration ---
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
        setSidebarItems(data);
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

  // --- Global Keyboard Event Debugging ---
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
  // SECTION 2.1: SIDEBAR CONTENT COMPONENT
  // =============================================================================
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
  // SECTION 2.2: HEADER CONTENT COMPONENT
  // =============================================================================
  const HeaderContent = ({ isCollapsed, onHeaderToggle }) => (
    <div className="flex items-center w-full">
      <div className="flex items-center gap-4">
        <button
          type="button"
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
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-foreground pt-0.5">Backup Device</h1>
          <p className="text-xs text-muted-foreground">Create a backup of your device configuration</p>
        </div>
      </div>
    </div>
  );

  // =============================================================================
  // SECTION 2.3: STEP CONTENT COMPONENT
  // =============================================================================
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Device Selection</h3>
              <DeviceTargetSelector 
                parameters={deviceParams}
                onParamChange={handleDeviceParamChange}
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Authentication</h3>
              <DeviceAuthFields 
                parameters={authParams}
                onParamChange={handleAuthParamChange}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleBackup}
                disabled={!isReadyToExecute}
              >
                Start Backup Process
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-medium">Backup in Progress</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Backing up device configuration...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Please do not close this window during the backup process.</p>
              <p>This may take several minutes to complete.</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-medium">Backup Results</h3>
            {backupStatus === 'success' ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-green-800 dark:text-green-200">Backup Successful</h4>
                      <p className="mt-1 text-green-700 dark:text-green-300">Device configuration has been successfully backed up.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-medium mb-2">Details:</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex">
                      <span className="w-32 text-muted-foreground">Target:</span>
                      <span>
                        {deviceParams.hostname || deviceParams.inventory_file.replace('.yaml', '').replace('.yml', '') || 'Unknown'}
                      </span>
                    </li>
                    <li className="flex">
                      <span className="w-32 text-muted-foreground">Timestamp:</span>
                      <span>{new Date().toLocaleString()}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 text-muted-foreground">Status:</span>
                      <span className="text-green-600 dark:text-green-400">Completed successfully</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-amber-800 dark:text-amber-200">No Results Available</h4>
                    <p className="mt-1 text-amber-700 dark:text-amber-300">Please complete the backup process to view results.</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button onClick={handleReset}>
                Start New Backup
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // =============================================================================
  // SECTION 2.4: MAIN RENDER SECTION
  // =============================================================================
  return (
    <div className="min-h-screen bg-background text-foreground">
      <WorkflowContainer
        sidebarContent={
          <SidebarContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={sidebarCollapsed}
          />
        }
        sidebarHeader={
          <div className={`flex items-center h-full px-4 transition-all duration-300 ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}>
            <div className="flex items-center gap-3">
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
          </div>
        }
        headerContent={<HeaderContent />}
        mainContent={
          activeTab === "backup" ? (
            <div className="w-full max-w-4xl mx-auto">
              <div className="mb-6 px-6">
                <h2 className="text-2xl font-bold">Device Configuration Backup Tool</h2>
                <p className="text-muted-foreground">Create backups of device configurations</p>
              </div>
              <div className="mb-6 px-6">
                <div className="flex items-center space-x-4">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${currentStep === step 
                          ? 'bg-primary text-primary-foreground' 
                          : currentStep > step 
                            ? 'bg-green-500 text-white' 
                            : 'bg-muted text-muted-foreground'
                        }
                      `}>
                        {currentStep > step ? '✓' : step}
                      </div>
                      <span className={`ml-2 text-sm ${
                        currentStep === step ? 'font-medium' : 'text-muted-foreground'
                      }`}>
                        {step === 1 ? 'Select' : step === 2 ? 'Execute' : 'Results'}
                      </span>
                      {step < 3 && (
                        <div className={`w-12 h-px mx-4 ${
                          currentStep > step ? 'bg-green-500' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden bg-card">
                {renderStepContent()}
              </div>
            </div>
          ) : (
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
