/**
 * File Path: src/pages/Operations/Backup.jsx
 * Version: 3.8.0
 *
 * Description:
 * Modern redesigned backup operations page with enhanced UI/UX and tab-based interface.
 * Features glassmorphism design, improved accessibility, and comprehensive light/dark mode support.
 * Uses WorkflowContainer for consistent layout with collapsible sidebar and a tabbed interface
 * for backup and restore operations, including configuration, execution, and results viewing.
 *
 * NEW: Integrated RealTimeDisplay, ProgressBar, and ProgressStep components for professional
 * real-time progress tracking with WebSocket integration.
 * UPDATE (v3.8.0): Replaced basic progress display with enhanced real-time progress components
 * for better user experience and comprehensive progress visualization.
 *
 * NOTE: This file includes mock implementations of WorkflowContainer, Tooltip, etc. Replace them
 * with your real shared components if available.
 */

import React, { useState, useEffect, useRef } from "react";
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
// SECTION 1: REAL-TIME PROGRESS COMPONENTS IMPORT
// =============================================================================
/**
 * NEW: Import enhanced real-time progress components for professional progress tracking
 * These components provide comprehensive progress visualization with two-line log format,
 * collapsible sections, auto-scrolling, and WebSocket integration compatibility.
 */
import RealTimeDisplay, { ProgressBar, ProgressStep } from '@/realTimeProgress';

// =============================================================================
// SECTION 2: CONFIGURATION & CONSTANTS
// =============================================================================
const API_BASE_URL = "http://localhost:3010";
const WS_URL = "ws://localhost:3010/ws"; // UPDATED: Connect to Rust backend WebSocket

// Animation duration constants (if used in classNames)
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
// SECTION 3: SMALL UI HELPERS (Tooltip, Container, etc.)
// =============================================================================

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

const TooltipProvider = ({ children }) => <>{children}</>;

/**
 * WorkflowContainer (mock)
 * Replace with your real WorkflowContainer if available.
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
        <div className={`${isCollapsed ? 'w-16' : 'w-72'} border-r border-border dark:border-gray-700 bg-card dark:bg-black transition-all duration-300 flex flex-col overflow-hidden`}>
          <div className="h-16 border-b border-border dark:border-gray-700 flex items-center">
            {sidebarHeader}
          </div>
          <div className="flex-1 overflow-y-auto">
            {React.cloneElement(sidebarContent, { isCollapsed })}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {headerContent && (
            <header className="h-16 border-b border-border dark:border-gray-700 bg-background dark:bg-black px-6 flex items-center">
              {React.cloneElement(headerContent, { isCollapsed, onHeaderToggle })}
            </header>
          )}
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
 * NavigationItem (mock)
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

  if (isCollapsed) {
    return <Tooltip content={label} side="right">{content}</Tooltip>;
  }
  return content;
};

// =============================================================================
// SECTION 4: RESTORE FORM & Dropdown Helpers (used by Restore tab)
// =============================================================================

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

const RestoreForm = ({ parameters, onParamChange, hosts, backups, loadingHosts, loadingBackups, error }) => {
  // Inline icons
  const HostIcon = (
    <svg fill="currentColor" viewBox="0 0 24 24" stroke="none"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"/></svg>
  );

  const BackupIcon = (
    <svg fill="currentColor" viewBox="0 0 24 24" stroke="none"><path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h16v12H4V4zm2 2v8h12V6H6zm2 2h8v4H8V8z"/></svg>
  );

  return (
    <div className="min-h-fit bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-black dark:via-black dark:to-black p-4">
      <div className="max-w-4xl mx-auto space-y-6">
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

        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          <DeviceAuthFields parameters={parameters} onParamChange={onParamChange} />
        </div>

        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-2 bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 rounded-xl">
              {React.cloneElement(BackupIcon, { className: "w-5 h-5 text-white dark:text-gray-900" })}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Select Backup Source</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Choose your device and backup file to restore</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ModernDropdown
              label="Host Device"
              value={parameters.hostname || ""}
              onChange={(value) => onParamChange("hostname", value)}
              options={hosts}
              placeholder="Select a host device..."
              loading={loadingHosts}
              icon={HostIcon}
            />

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
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SECTION 5: MAIN BACKUP COMPONENT - ModernBackup
// =============================================================================
function ModernBackup() {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState("backup");
  const [currentBackupTab, setCurrentBackupTab] = useState("select");
  const [currentTab, setCurrentTab] = useState("restore"); // for restore workflow
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

  // Execution / progress states
  const [progress, setProgress] = useState(0);
  const [backupStatus, setBackupStatus] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState(null);

  // Restore form states
  const [hosts, setHosts] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [errorRestore, setErrorRestore] = useState(null);

  // =============================================================================
  // SECTION 5.1: ENHANCED REAL-TIME PROGRESS STATE MANAGEMENT
  // =============================================================================
  /**
   * NEW: Enhanced progress tracking state for RealTimeDisplay integration
   * This replaces the basic logs array with structured progress steps that include
   * proper categorization, timestamps, and status levels for professional display.
   */
  const [progressSteps, setProgressSteps] = useState([]);
  const [jobId, setJobId] = useState(null);
  const jobIdRef = useRef(null); // keep a ref for websocket closure safety

  // --- helpers ---
  useEffect(() => { jobIdRef.current = jobId; }, [jobId]);

  // =============================================================================
  // SECTION 5.2: PROGRESS STEP FORMATTING HELPER
  // =============================================================================
  /**
   * NEW: Helper function to format WebSocket messages into structured progress steps
   * This ensures compatibility between WebSocket data format and RealTimeDisplay requirements
   */
  const formatProgressStep = (data, eventType) => {
    // Determine the appropriate level based on event type and content
    let level = 'info';
    if (eventType === 'failed') level = 'error';
    else if (eventType === 'completed') level = 'success';
    else if (eventType === 'warning') level = 'warning';
    else if (eventType === 'progress') level = 'info';

    // Extract message from various possible data structures
    let message = 'Processing...';
    if (typeof data === 'string') {
      message = data;
    } else if (data?.message) {
      message = data.message;
    } else if (data?.data?.message) {
      message = data.data.message;
    } else if (data) {
      message = JSON.stringify(data);
    }

    return {
      message,
      level,
      timestamp: new Date().toISOString(),
      type: eventType,
      step: `Step ${progressSteps.length + 1}`
    };
  };

  // -----------------------
  // Event Handlers
  // -----------------------
  const handleParamChange = (name, value) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  const handleHeaderToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // =============================================================================
  // SECTION 5.3: handleBackup with Enhanced Real-Time Progress Integration
  // =============================================================================
  const handleBackup = async (event) => {
      event.preventDefault();

      // Basic validation
      if (!parameters.hostname && !parameters.inventory_file) {
          toast.error('Please specify a hostname or an inventory file.');
          return;
      }

      // Reset progress steps and move to execute tab
      setCurrentBackupTab("execute");
      setBackupStatus(null);
      setProgress(0);
      setProgressSteps([]);
      setJobId(null);
      jobIdRef.current = null;
      
      // Add initial progress step
      setProgressSteps(prev => [...prev, formatProgressStep('Starting backup process...', 'started')]);
      
      toast.loading('Starting backup...', { id: 'backup-toast' });

      const payload = {
          hostname: parameters.hostname || undefined,
          inventory_file: parameters.inventory_file || undefined,
          username: parameters.username,
          password: parameters.password
      };

      try {
          // Trigger backup on backend
          const response = await fetch(`${API_BASE_URL}/api/backups/devices`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
          });

          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }

          const data = await response.json();
          console.log("Backup response:", data);

          // FIXED: Handle both response structures
          let jobId = null;
          
          // Check for job_id in root level (new structure)
          if (data.job_id) {
              jobId = data.job_id;
          } 
          // Check for job_id nested in files object (old structure from curl test)
          else if (data.files && data.files.job_id) {
              jobId = data.files.job_id;
          }
          // Check for job_id in any nested structure
          else if (data.data && data.data.job_id) {
              jobId = data.data.job_id;
          }

          if (jobId) {
              setJobId(jobId);
              jobIdRef.current = jobId;
              setProgressSteps(prev => [...prev, formatProgressStep(`Backup job started with ID: ${jobId}`, 'info')]);
              
              toast.success('Backup started! Tracking progress via WebSocket...', { id: 'backup-toast' });
              
              // WebSocket should handle progress updates from here
          } else {
              // If no job_id found, check if this is a completed backup response
              if (data.status === "success" && data.files) {
                  // This is a completed backup response (synchronous completion)
                  setBackupStatus('success');
                  setProgress(100);
                  setProgressSteps(prev => [...prev, formatProgressStep('Backup completed successfully', 'completed')]);
                  setCurrentBackupTab("results");
                  toast.success('Backup completed successfully!', { id: 'backup-toast' });
              } else {
                  throw new Error('Backend did not return job ID for tracking');
              }
          }

      } catch (error) {
          console.error("Backup failed to start:", error);
          setBackupStatus('error');
          setProgress(0);
          setProgressSteps(prev => [...prev, formatProgressStep(`Failed to start backup: ${error.message}`, 'failed')]);
          setCurrentBackupTab("results");
          toast.error(`Backup failed to start: ${error.message}`, { id: 'backup-toast' });
      }
  };

  // Restore handler (keeps simulated behavior)
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

  // Reset both workflows
  const handleReset = () => {
    if (activeTab === 'backup') {
      setParameters({ hostname: '', inventory_file: '', username: '', password: '', backup_file: '' });
      setBackupStatus(null);
      setProgress(0);
      setCurrentBackupTab("select");
      setProgressSteps([]); // NEW: Clear progress steps on reset
      setJobId(null);
      jobIdRef.current = null;
    } else if (activeTab === 'restore') {
      setCurrentTab('restore');
      setRestoreStatus(null);
      setParameters({ hostname: '', inventory_file: '', username: '', password: '', backup_file: '' });
      setProgress(0);
    }
  };

  // Validation helpers
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

  // =============================================================================
  // SECTION 6: API INTEGRATION (sidebar/devices/backups)
  // =============================================================================
  useEffect(() => {
    const fetchSidebarItems = async () => {
      try {
        setLoading(true);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const url = '/api/sidebar/backup';
        let response = await fetch(url);

        if (response.headers.get('content-type')?.includes('text/html')) {
          response = await fetch(`${apiBaseUrl}/api/sidebar/backup`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`);
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
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

  useEffect(() => {
    if (activeTab !== 'restore') return;
    const fetchHosts = async () => {
      setLoadingHosts(true);
      setErrorRestore(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/backups/devices`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        let hostOptions = [];

        if (data.devices && Array.isArray(data.devices)) {
          hostOptions = data.devices.map(device => ({
            value: device.name,
            label: device.name,
            description: `Backups: ${device.backup_count || 0}`
          }));
        } else if (data.devices && typeof data.devices === 'object') {
          hostOptions = Object.keys(data.devices).map(deviceName => ({
            value: deviceName,
            label: deviceName,
            description: `Backups: ${data.devices[deviceName]?.length || 0}`
          }));
        } else if (data.status === 'success' && data.devices) {
          hostOptions = Object.keys(data.devices).map(deviceName => ({
            value: deviceName,
            label: deviceName,
            description: `Backups: ${data.devices[deviceName]?.length || 0}`
          }));
        } else {
          const deviceNames = Object.keys(data).filter(key => key !== 'status' && key !== 'error' && key !== 'path');
          if (deviceNames.length > 0) {
            hostOptions = deviceNames.map(deviceName => ({
              value: deviceName,
              label: deviceName,
              description: `Backups: ${Array.isArray(data[deviceName]) ? data[deviceName].length : 0}`
            }));
          }
        }

        setHosts(hostOptions);
      } catch (error) {
        console.error('Error fetching hosts:', error);
        setErrorRestore('Failed to load host devices');
        setHosts([]);
        toast.error("Unable to fetch host devices. Please check your connection.");
      } finally {
        setLoadingHosts(false);
      }
    };
    fetchHosts();
  }, [activeTab]);

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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        let backupOptions = [];

        if (data.backups && Array.isArray(data.backups)) {
          backupOptions = data.backups.map(backup => ({
            value: backup.name,
            label: backup.name,
            description: `Size: ${formatFileSize(backup.size)} • Modified: ${formatTimestamp(backup.modified)}`
          }));
        } else if (Array.isArray(data)) {
          backupOptions = data.map(backupFile => ({
            value: backupFile,
            label: backupFile,
            description: 'Backup file'
          }));
        } else if (data.devices && data.devices[selectedHost]) {
          backupOptions = data.devices[selectedHost].map(backupFile => ({
            value: backupFile,
            label: backupFile,
            description: 'Backup file'
          }));
        } else if (typeof data === 'object') {
          const backupFiles = Object.values(data).find(value => Array.isArray(value));
          if (backupFiles) {
            backupOptions = backupFiles.map(backupFile => ({
              value: backupFile,
              label: backupFile,
              description: 'Backup file'
            }));
          }
        }

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

  // Debug param logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Backup parameters updated:", parameters);
    }
  }, [parameters]);

  // =============================================================================
  // SECTION 7: WebSocket Integration with Enhanced Progress Step Formatting
  // =============================================================================
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket backend");
      // Subscribe to job events
      const subscribeMsg = {
        type: "Subscribe",
        payload: {
          topics: ["job_events", "jobs:all"]
        }
      };
      ws.send(JSON.stringify(subscribeMsg));
      console.log("📨 Subscribed to job events");
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        console.log("📡 WebSocket raw message:", msg);

        // Handle different message structures
        if (msg.type === "JobEvent" && msg.payload) {
          processJobEvent(msg.payload);
        } else if (msg.job_id && msg.event_type) {
          // Direct job event format
          processJobEvent(msg);
        } else if (msg.payload && msg.payload.job_id) {
          // Nested payload format
          processJobEvent(msg.payload);
        }
      } catch (err) {
        console.error("❌ WebSocket message parsing error:", err, evt.data);
      }
    };

    const processJobEvent = (jobEvent) => {
      // Only process events for our current job
      if (jobIdRef.current && jobEvent.job_id === jobIdRef.current) {
        console.log("🎯 Processing job event for current job:", jobEvent);
        
        // Format progress message
        let message = jobEvent.data?.message || jobEvent.message;
        if (!message) {
          message = `[${jobEvent.event_type}] ${jobEvent.status || ''}`.trim();
        }
        
        const progressStep = formatProgressStep(message, jobEvent.event_type);
        setProgressSteps(prev => [...prev, progressStep]);

        // Update UI based on event type
        switch (jobEvent.event_type) {
          case "started":
            setProgress(10);
            break;
            
          case "STEP_START":
          case "STEP_COMPLETE":
            setProgress(prev => Math.min(prev + 20, 90));
            break;
            
          case "OPERATION_COMPLETE":
            if (jobEvent.status === "SUCCESS" || jobEvent.data?.status === "SUCCESS") {
              setBackupStatus("success");
              setProgress(100);
              setTimeout(() => setCurrentBackupTab("results"), 1000);
              toast.success("Backup completed successfully!");
            } else {
              setBackupStatus("error");
              setProgress(100);
              setTimeout(() => setCurrentBackupTab("results"), 1000);
              toast.error(`Backup failed: ${jobEvent.error || jobEvent.data?.error || 'Unknown error'}`);
            }
            break;
            
          case "progress":
            setProgress(prev => Math.min(prev + 5, 95));
            break;
            
          case "failed":
            setBackupStatus("error");
            setProgress(100);
            setTimeout(() => setCurrentBackupTab("results"), 1000);
            toast.error(`Backup failed: ${jobEvent.error || jobEvent.data?.error || 'Unknown error'}`);
            break;
            
          default:
            // Increment progress for any unknown event
            setProgress(prev => Math.min(prev + 2, 98));
        }
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounting");
      }
    };
  }, []);

  // =============================================================================
  // SECTION 8: Sidebar / Header components (mock)
  // =============================================================================
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
        <div className="flex flex-col justify-center">
          <h1 className="text-lg font-semibold text-foreground dark:text-gray-100 leading-tight">
            {activeTab === 'backup' ? 'Backup Device' : 'Restore Device'}
          </h1>
        </div>
      </div>
    </div>
  );

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
            <h2 className="font-semibold text-foreground dark:text-gray-100 truncate leading-tight">Operations</h2>
            <p className="text-xs text-muted-foreground dark:text-gray-400 truncate leading-tight mt-0.5">Backups</p>
          </div>
        )}
      </div>
    </div>
  );

  // =============================================================================
  // SECTION 9: MAIN RENDER WITH ENHANCED REAL-TIME DISPLAY INTEGRATION
  // =============================================================================
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
                    ${currentBackupTab === (step === 1 ? 'select' : step === 2 ? 'execute' : 'results')
                      ? 'bg-primary dark:bg-gray-700 text-primary-foreground dark:text-gray-100'
                      : backupStatus === 'success' && step <= 3
                        ? 'bg-green-500 dark:bg-green-600 text-white'
                        : 'bg-muted dark:bg-gray-700 text-muted-foreground dark:text-gray-400'
                    }
                  `}>
                    {backupStatus === 'success' && step <= 3 ? '✓' : step}
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentBackupTab === (step === 1 ? 'select' : step === 2 ? 'execute' : 'results')
                      ? 'font-medium text-gray-900 dark:text-gray-100'
                      : 'text-muted-foreground dark:text-gray-400'
                  }`}>
                    {step === 1 ? 'Select' : step === 2 ? 'Execute' : 'Results'}
                  </span>
                  {step < 3 && (
                    <div className={`w-12 h-px mx-4 ${
                      (step === 1 && currentBackupTab !== 'select') || (step === 2 && currentBackupTab === 'results')
                        ? 'bg-green-500 dark:bg-green-600'
                        : 'bg-muted dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Tabs value={currentBackupTab} className="w-full">
            {/* Select Tab - Unchanged */}
            <TabsContent value="select" className="mt-6">
              <div className="border rounded-lg overflow-hidden bg-card dark:bg-black p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Device Selection</h3>
                  <DeviceTargetSelector parameters={parameters} onParamChange={handleParamChange} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Authentication</h3>
                  <DeviceAuthFields parameters={parameters} onParamChange={handleParamChange} />
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
            </TabsContent>

            {/* =============================================================================
                EXECUTE TAB: ENHANCED WITH REAL-TIME DISPLAY COMPONENT
                NEW: Replaced basic progress display with professional RealTimeDisplay
                ============================================================================= */}
            <TabsContent value="execute" className="mt-6">
              <RealTimeDisplay
                isActive={true}
                isRunning={currentBackupTab === 'execute'}
                isComplete={backupStatus === 'success'}
                hasError={backupStatus === 'error'}
                progress={progressSteps}
                progressPercentage={progress}
                currentStep={progressSteps[progressSteps.length - 1]?.message || 'Starting backup process...'}
                totalSteps={progressSteps.length}
                completedSteps={progressSteps.filter(step => 
                  step.level === 'success' || step.type === 'completed'
                ).length}
                result={backupStatus === 'success' ? { 
                  message: 'Backup completed successfully',
                  details: {
                    hostname: parameters.hostname,
                    timestamp: new Date().toISOString(),
                    totalSteps: progressSteps.length,
                    successfulSteps: progressSteps.filter(step => step.level === 'success').length
                  }
                } : null}
                error={backupStatus === 'error' ? { 
                  message: 'Backup operation failed',
                  details: {
                    hostname: parameters.hostname,
                    timestamp: new Date().toISOString(),
                    errorStep: progressSteps.find(step => step.level === 'error')?.message || 'Unknown error',
                    totalSteps: progressSteps.length
                  }
                } : null}
                onReset={handleReset}
                canReset={true}
                compact={false}
                maxLogHeight="max-h-96"
              />
            </TabsContent>

            {/* Results Tab - Enhanced with better status display */}
            <TabsContent value="results" className="mt-6">
              <div className="p-6 space-y-6 bg-card dark:bg-black rounded-lg border border-border dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Backup Results</h3>
                {backupStatus === 'success' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-800/30">
                          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-medium text-green-800 dark:text-green-200">Backup Successful</h4>
                          <p className="mt-1 text-green-700 dark:text-green-300">Device configuration has been backed up successfully.</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted dark:bg-gray-700 p-4 rounded-md">
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Execution Summary</h4>
                      <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Target:</span>
                          <span>{parameters.hostname || 'Multiple / inventory'}</span>
                        </li>
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Status:</span>
                          <span className="text-green-600 dark:text-green-400">Completed</span>
                        </li>
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Total Steps:</span>
                          <span>{progressSteps.length}</span>
                        </li>
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Timestamp:</span>
                          <span>{new Date().toLocaleString()}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-800/30">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-medium text-red-800 dark:text-red-200">Backup Failed</h4>
                        <p className="mt-1 text-red-700 dark:text-red-300">An error occurred during backup. Please review the progress log for details.</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleReset}
                    className="bg-primary dark:bg-gray-700 text-primary-foreground dark:text-gray-100 hover:bg-primary/90 dark:hover:bg-gray-600"
                  >
                    Start New Backup
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      );
    } else if (activeTab === 'restore') {
      // Restore UI (unchanged - uses basic progress display)
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
  // MAIN RENDER
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

export default ModernBackup;
