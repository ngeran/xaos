/**
 * File Path: src/pages/Operations/Backup.jsx
 * Version: 3.8.7 - FIXED DYNAMIC TOTAL STEPS AND WEBSOCKET ISSUES
 *
 * FIXES APPLIED:
 * 1. Extract totalSteps dynamically from WebSocket messages (data.total_steps)
 * 2. Added subscriptions for job-specific topics (e.g., job:<job_id>)
 * 3. Conditional progress simulation only when WebSocket disconnected and no totalSteps received
 * 4. Increased timeout to 120 seconds for backend processing
 * 5. Enhanced WebSocket reconnection with better logging
 * 6. Improved message parsing for various backend message formats
 * 7. Updated RealTimeDisplay to use dynamic totalSteps and accurate completedSteps
 * 8. Clarified WebSocket disconnection status in UI
 * 9. Fixed incorrect step count display (e.g., 0/13)
 * 10. Added fallback for missing total_steps to prevent division by zero
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
  ChevronRight,
  Wifi,
  WifiOff
} from "lucide-react";

import DeviceTargetSelector from '@/shared/DeviceTargetSelector';
import DeviceAuthFields from '@/shared/DeviceAuthFields';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PulseLoader from 'react-spinners/PulseLoader';
import toast from 'react-hot-toast';

// Real-time progress components
import RealTimeDisplay, { ProgressBar, ProgressStep } from '@/realTimeProgress';

// =============================================================================
// CONFIGURATION
// =============================================================================
const API_BASE_URL = "http://localhost:3010";
const WS_URL = "ws://localhost:3010/ws";

// Animation duration constants
const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300
};

// Valid job event types from Python backend
const VALID_JOB_EVENTS = [
  'OPERATION_START',
  'STEP_START',
  'STEP_COMPLETE',
  'OPERATION_COMPLETE'
];

// Helper functions
const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp || 'Unknown';
  }
};

// UI Helper Components
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
// MAIN BACKUP COMPONENT - ModernBackup
// =============================================================================
function ModernBackup() {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState("backup");
  const [currentBackupTab, setCurrentBackupTab] = useState("select");
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

  // Execution / progress states
  const [progress, setProgress] = useState(0);
  const [backupStatus, setBackupStatus] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [progressSteps, setProgressSteps] = useState([]);
  const [totalSteps, setTotalSteps] = useState(0); // Dynamic totalSteps
  const [jobId, setJobId] = useState(null);
  const jobIdRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Restore form states
  const [hosts, setHosts] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [errorRestore, setErrorRestore] = useState(null);

  // WebSocket ref for manual control
  const wsRef = useRef(null);

  // Fallback progress simulation
  const simulateProgressRef = useRef(null);

  // Reconnection attempt count
  const reconnectionAttempt = useRef(0);

  // =============================================================================
  // WEB SOCKET SETUP WITH ENHANCED DEBUGGING AND SUBSCRIPTION
  // =============================================================================
  useEffect(() => {
    const connectWebSocket = () => {
      console.log('📡 Attempting WebSocket connection to:', WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📡 WebSocket connected');
        setWsConnected(true);
        reconnectionAttempt.current = 0;

        // Subscribe to multiple possible topics
        const subscriptionMessages = [
          { subscription: { topic: "JobEvent" } },
          { subscription: { topic: "job_event" } },
          { event: "subscribe", payload: { topic: "JobEvent" } },
          { type: "subscribe", topic: "JobEvent" },
          ...(jobIdRef.current ? [
            { subscription: { topic: `job:${jobIdRef.current}` } },
            { type: "subscribe", topic: `job:${jobIdRef.current}` },
            { subscription: { topic: `job/${jobIdRef.current}` } }
          ] : [])
        ];
        subscriptionMessages.forEach(msg => {
          try {
            ws.send(JSON.stringify(msg));
            console.log('📡 Sent subscription:', msg);
          } catch (err) {
            console.error('❌ Failed to send subscription:', msg, err);
          }
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📡 Full WS message:', message);

          // Handle possible message wrappers
          let payload = message;
          if (message.job_event) {
            payload = message.job_event;
          } else if (message.payload) {
            payload = message.payload;
          } else if (message.event) {
            payload = message.event;
          }

          // Check if message is a job-related event
          if (
            VALID_JOB_EVENTS.includes(payload.event_type) &&
            (!payload.job_id || payload.job_id === jobIdRef.current)
          ) {
            console.log('📊 Processing job progress message:', payload);

            const step = {
              message: payload.message || 'Processing...',
              level: payload.level?.toLowerCase() === 'success' ? 'success' :
                     payload.level?.toLowerCase() === 'error' ? 'error' : 'info',
              type: payload.event_type,
              timestamp: payload.timestamp || new Date().toISOString(),
              job_id: payload.job_id || jobIdRef.current
            };

            setProgressSteps(prev => [...prev, step]);

            // Update totalSteps and progress
            if (payload.event_type === 'STEP_START' || payload.event_type === 'STEP_COMPLETE') {
              const stepNumber = payload.data?.step || 0;
              const totalStepsFromMessage = payload.data?.total_steps || totalSteps || 1;
              setTotalSteps(totalStepsFromMessage);
              setProgress(Math.min((stepNumber / totalStepsFromMessage) * 100, 100));
            }

            if (payload.event_type === 'OPERATION_COMPLETE') {
              setBackupStatus(payload.level?.toLowerCase() === 'success' ? 'success' : 'error');
              setCurrentBackupTab('results');
              if (payload.level?.toLowerCase() === 'error') {
                toast.error('Backup failed: ' + (payload.message || 'Unknown error'));
              }
              if (simulateProgressRef.current) {
                clearInterval(simulateProgressRef.current);
                simulateProgressRef.current = null;
              }
            } else if (payload.level?.toLowerCase() === 'error') {
              setBackupStatus('error');
              setCurrentBackupTab('results');
              toast.error('Backup failed: ' + (payload.message || 'Unknown error'));
              if (simulateProgressRef.current) {
                clearInterval(simulateProgressRef.current);
                simulateProgressRef.current = null;
              }
            }
          } else if (message.type === 'Ping') {
            console.log('ℹ️ Non-job WebSocket message:', { type: message.type, keys: Object.keys(message) });
            ws.send(JSON.stringify({ type: 'Pong' }));
          } else {
            console.log('ℹ️ Ignored non-job WebSocket message:', message);
          }
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err, 'Raw message:', event.data);
        }
      };

      ws.onclose = () => {
        console.log('📡 WebSocket disconnected');
        setWsConnected(false);
        reconnectionAttempt.current += 1;
        const delay = Math.min(1000 * 2 ** reconnectionAttempt.current, 60000);
        console.log(`📡 Attempting reconnect in ${delay}ms (attempt ${reconnectionAttempt.current})`);
        setTimeout(connectWebSocket, delay);
      };

      ws.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
        setWsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (simulateProgressRef.current) {
        clearInterval(simulateProgressRef.current);
      }
    };
  }, []);

  // =============================================================================
  // TIMEOUT AND FALLBACK PROGRESS SIMULATION
  // =============================================================================
  useEffect(() => {
    let timeout;
    if (backupStatus === 'running') {
      // Only simulate progress if WebSocket is disconnected and no totalSteps received
      if (!wsConnected && totalSteps === 0) {
        simulateProgressRef.current = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) return prev;
            return prev + 10;
          });
          setProgressSteps(prev => [
            ...prev,
            {
              message: `Simulated progress update (${progress + 10}%)`,
              level: 'info',
              type: 'SIMULATED',
              timestamp: new Date().toISOString(),
              job_id: jobIdRef.current
            }
          ]);
        }, 10000);
      }

      timeout = setTimeout(() => {
        console.log('⏰ Backup timeout - no progress updates received for 120 seconds');
        setBackupStatus('error');
        setCurrentBackupTab('results');
        setProgressSteps(prev => [
          ...prev,
          {
            message: 'Operation timed out - no progress updates received',
            level: 'error',
            timestamp: new Date().toISOString(),
            job_id: jobIdRef.current
          }
        ]);
        toast.error('Backup timed out after 120 seconds');
        if (simulateProgressRef.current) {
          clearInterval(simulateProgressRef.current);
          simulateProgressRef.current = null;
        }
      }, 120000);
    }
    return () => {
      clearTimeout(timeout);
      if (simulateProgressRef.current) {
        clearInterval(simulateProgressRef.current);
      }
    };
  }, [backupStatus, wsConnected, totalSteps, progress]);

  // =============================================================================
  // HANDLER FUNCTIONS
  // =============================================================================
  const handleParamChange = (key, value) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setCurrentBackupTab('select');
    setCurrentTab('restore');
    setBackupStatus(null);
    setRestoreStatus(null);
    setProgress(0);
    setProgressSteps([]);
    setTotalSteps(0);
    setJobId(null);
    jobIdRef.current = null;
    setParameters({
      hostname: '',
      inventory_file: '',
      username: '',
      password: '',
      backup_file: ''
    });
  };

  const handleBackup = async () => {
    try {
      setCurrentBackupTab('execute');
      setBackupStatus('running');
      setProgress(0);
      setTotalSteps(0);
      setProgressSteps([
        {
          message: 'Initiating backup process...',
          level: 'info',
          type: 'INIT',
          timestamp: new Date().toISOString(),
          job_id: jobIdRef.current
        }
      ]);

      console.log('🚀 Starting backup process...');
      console.log('🚀 Sending backup request to:', `${API_BASE_URL}/backups/devices`);
      console.log('📦 Payload:', parameters);

      const response = await fetch(`${API_BASE_URL}/backups/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: parameters.hostname,
          hostname: parameters.hostname,
          inventory_file: parameters.inventory_file,
          username: parameters.username,
          password: parameters.password
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Backup API response:', data);

      if (data.status === 'started') {
        setJobId(data.job_id);
        jobIdRef.current = data.job_id;
        console.log('🎯 Job started with ID:', data.job_id);

        // Update initial step with job_id
        setProgressSteps(prev => [
          {
            ...prev[0],
            job_id: data.job_id
          }
        ]);

        // Send subscription messages if WebSocket is connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const subscriptionMessages = [
            { subscription: { topic: "JobEvent" } },
            { subscription: { topic: "job_event" } },
            { event: "subscribe", payload: { topic: "JobEvent" } },
            { type: "subscribe", topic: "JobEvent" },
            { subscription: { topic: `job:${data.job_id}` } },
            { type: "subscribe", topic: `job:${data.job_id}` },
            { subscription: { topic: `job/${data.job_id}` } }
          ];
          subscriptionMessages.forEach(msg => {
            try {
              wsRef.current.send(JSON.stringify(msg));
              console.log('📡 Sent subscription:', msg);
            } catch (err) {
              console.error('❌ Failed to send subscription:', msg, err);
            }
          });
        }

        console.log('📡 WebSocket will now handle progress updates for job:', data.job_id);
      } else {
        throw new Error(data.error || 'Failed to start backup');
      }
    } catch (err) {
      console.error('❌ Backup error:', err);
      setBackupStatus('error');
      setCurrentBackupTab('results');
      setProgressSteps(prev => [
        ...prev,
        {
          message: `Failed to start backup: ${err.message}`,
          level: 'error',
          timestamp: new Date().toISOString(),
          job_id: jobIdRef.current
        }
      ]);
      toast.error('Failed to start backup: ' + err.message);
      if (simulateProgressRef.current) {
        clearInterval(simulateProgressRef.current);
        simulateProgressRef.current = null;
      }
    }
  };

  const handleRestore = async () => {
    setCurrentTab('execute');
    setRestoreStatus('running');
    setProgress(0);

    const simulateProgress = () => {
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
      }, 500);
    };

    simulateProgress();
  };

  const isBackupValid = parameters.username && parameters.password && (parameters.hostname || parameters.inventory_file);
  const isRestoreValid = parameters.username && parameters.password && parameters.hostname && parameters.backup_file;

  // =============================================================================
  // SIDEBAR AND HEADER COMPONENTS
  // =============================================================================
  const SidebarHeader = ({ isCollapsed }) => (
    <div className="flex items-center justify-between w-full px-4">
      {!isCollapsed && <h1 className="text-xl font-bold">Operations</h1>}
      <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
    </div>
  );

  const SidebarContent = ({ activeTab, setActiveTab, isCollapsed }) => (
    <nav className="p-4 space-y-2">
      <NavigationItem
        icon={Download}
        label="Backup"
        description="Create device backups"
        isActive={activeTab === 'backup'}
        onClick={() => setActiveTab('backup')}
        isCollapsed={isCollapsed}
      />
      <NavigationItem
        icon={Upload}
        label="Restore"
        description="Restore from backups"
        isActive={activeTab === 'restore'}
        onClick={() => setActiveTab('restore')}
        isCollapsed={isCollapsed}
      />
      <NavigationItem
        icon={History}
        label="History"
        description="View operation logs"
        isActive={activeTab === 'history'}
        onClick={() => setActiveTab('history')}
        isCollapsed={isCollapsed}
      />
      <NavigationItem
        icon={Settings}
        label="Settings"
        description="Configure options"
        isActive={activeTab === 'settings'}
        onClick={() => setActiveTab('settings')}
        isCollapsed={isCollapsed}
      />
    </nav>
  );

  const HeaderContent = () => (
    <div className="flex items-center space-x-4">
      <h1 className="text-2xl font-bold">Backup & Restore</h1>
    </div>
  );

  const handleSidebarToggle = () => setSidebarCollapsed(!sidebarCollapsed);
  const handleHeaderToggle = () => {};

  // =============================================================================
  // MAIN CONTENT RENDERING
  // =============================================================================
  const renderMainContent = () => {
    if (activeTab === 'backup') {
      return (
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 px-6">
            <div className="flex items-center space-x-4">
              {['select', 'execute', 'results'].map((tab, index) => (
                <div key={tab} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentBackupTab === tab
                      ? 'bg-primary dark:bg-gray-700 text-primary-foreground dark:text-gray-100'
                      : backupStatus === 'success' && index < 3
                        ? 'bg-green-500 dark:bg-green-600 text-white'
                        : 'bg-muted dark:bg-gray-700 text-muted-foreground dark:text-gray-400'
                    }
                  `}>
                    {backupStatus === 'success' && index < 3 ? '✓' : index + 1}
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentBackupTab === tab
                      ? 'font-medium text-gray-900 dark:text-gray-100'
                      : 'text-muted-foreground dark:text-gray-400'
                  }`}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </span>
                  {index < 2 && (
                    <div className={`w-12 h-px mx-4 ${
                      (index === 0 && currentBackupTab !== 'select') || (index === 1 && currentBackupTab === 'results')
                        ? 'bg-green-500 dark:bg-green-600'
                        : 'bg-muted dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Tabs value={currentBackupTab} className="w-full">
            <TabsContent value="select" className="mt-6">
              <div className="p-6 space-y-6 bg-card dark:bg-black rounded-lg border border-border dark:border-gray-700">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Target Selection</h3>
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

            <TabsContent value="execute" className="mt-6">
              <div className="p-6 space-y-6 bg-card dark:bg-black rounded-lg border border-border dark:border-gray-700">
                {!wsConnected && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <WifiOff className="h-5 w-5 text-yellow-600 mr-2" />
                      <div>
                        <h4 className="text-yellow-800 font-medium">WebSocket Disconnected</h4>
                        <p className="text-yellow-700 text-sm">
                          Real-time updates unavailable. Waiting for backend progress.
                          {totalSteps === 0 ? ' No step information received.' : ` Tracking ${totalSteps} steps.`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Backup in Progress {jobId ? `(Job ID: ${jobId})` : ''}
                </h3>
                <RealTimeDisplay
                  isActive={true}
                  isRunning={currentBackupTab === 'execute' && backupStatus !== 'success' && backupStatus !== 'error'}
                  isComplete={backupStatus === 'success'}
                  hasError={backupStatus === 'error'}
                  progress={progressSteps}
                  progressPercentage={progress}
                  currentStep={progressSteps[progressSteps.length - 1]?.message || 'Starting backup process...'}
                  totalSteps={totalSteps || 1}
                  completedSteps={progressSteps.filter(step => 
                    step.type === 'STEP_COMPLETE' || step.type === 'OPERATION_COMPLETE'
                  ).length}
                  result={backupStatus === 'success' ? { 
                    message: 'Backup completed successfully',
                    details: {
                      hostname: parameters.hostname,
                      timestamp: new Date().toISOString(),
                      totalSteps: totalSteps || progressSteps.length,
                      successfulSteps: progressSteps.filter(step => step.level === 'success').length,
                      job_id: jobId
                    }
                  } : null}
                  error={backupStatus === 'error' ? { 
                    message: 'Backup operation failed',
                    details: {
                      hostname: parameters.hostname,
                      timestamp: new Date().toISOString(),
                      errorStep: progressSteps.find(step => step.level === 'error')?.message || 'Unknown error',
                      totalSteps: totalSteps || progressSteps.length,
                      job_id: jobId
                    }
                  } : null}
                  onReset={handleReset}
                  canReset={true}
                  compact={false}
                  maxLogHeight="max-h-96"
                />
              </div>
            </TabsContent>

            <TabsContent value="results" className="mt-6">
              <div className="p-6 space-y-6 bg-card dark:bg-black rounded-lg border border-border dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Backup Results {jobId ? `(Job ID: ${jobId})` : ''}
                </h3>
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
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Job ID:</span>
                          <span>{jobId || 'N/A'}</span>
                        </li>
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Status:</span>
                          <span className="text-green-600 dark:text-green-400">Completed</span>
                        </li>
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Total Steps:</span>
                          <span>{totalSteps || progressSteps.length}</span>
                        </li>
                        <li className="flex">
                          <span className="w-32 text-muted-foreground dark:text-gray-400">Timestamp:</span>
                          <span>{formatTimestamp(progressSteps[progressSteps.length - 1]?.timestamp)}</span>
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
                    {jobId && (
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        <span>Job ID: {jobId}</span>
                      </div>
                    )}
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
      return (
        <div className="w-full max-w-4xl mx-auto">
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
