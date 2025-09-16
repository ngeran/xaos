/**
 * File Path: src/pages/Operations/Backup.jsx
 * Version: 2.3.0
 * 
 * Description: 
 * Redesigned backup operations page using the WorkflowContainer component.
 * Provides a sidebar navigation with collapsible panel and main content area
 * for backup configuration and execution. Main content is offset vertically to
 * account for a 71px fixed header. Fully supports light and dark modes with a yellow
 * primary theme in dark mode via CSS variables from index.css. ThemeToggle ensures
 * proper theme switching.
 * 
 * Key Features:
 * - Uses WorkflowContainer for consistent layout
 * - Collapsible sidebar navigation
 * - Tabbed interface for different backup operations
 * - Responsive design with mobile support
 * - 71px vertical offset to clear fixed header
 * - Light/dark mode support with yellow primary theme in dark mode
 * 
 * How-To Guide:
 * 
 * Basic Usage:
 * ```jsx
 * import Backup from '@/pages/Operations/Backup';
 * 
 * function App() {
 *   return <Backup />;
 * }
 * ```
 * 
 * Advanced Usage with Theme Integration:
 * Ensure index.css includes the provided @layer base for theme variables.
 * Use ThemeToggle to switch between light and dark modes, applying the .dark class.
 * ```jsx
 * import Backup from '@/pages/Operations/Backup';
 * import { ThemeToggle } from '@/shared/ThemeToggle';
 * 
 * function App() {
 *   return (
 *     <div className="min-h-screen bg-background text-foreground">
 *       <ThemeToggle />
 *       <Backup />
 *     </div>
 *   );
 * }
 * ```
 */

import React, { useState } from "react";
import { WorkflowContainer } from "@/shared/WorkflowContainer";
import { MultiTabInterface } from "@/shared/MultiTabInterface";
import { NavigationItem } from "@/shared/NavigationItem";
import DeviceAuthFields from "@/shared/DeviceAuthFields";
import DeviceTargetSelector from "@/shared/DeviceTargetSelector";
import BackupForm from "@/forms/BackupForm";
import { 
  Home, 
  Server, 
  Database, 
  Settings, 
  History,
  Download,
  Upload
} from "lucide-react";

// =============================================================================
// SECTION 1: SIDEBAR CONTENT COMPONENT
// =============================================================================
// Navigation items for the sidebar with icons and labels, themed with CSS variables
const SidebarContent = ({ isCollapsed, activeTab, setActiveTab }) => {
  const navItems = [
    {
      id: "backup",
      icon: Download,
      label: "Backup Device",
      description: "Create device backups"
    },
    {
      id: "restore",
      icon: Upload,
      label: "Restore Device",
      description: "Restore from backup"
    },
    {
      id: "history",
      icon: History,
      label: "Backup History",
      description: "View backup records"
    },
    {
      id: "settings",
      icon: Settings,
      label: "Backup Settings",
      description: "Configure backup options"
    }
  ];

  return (
    <div className="flex flex-col gap-1 p-2">
      {navItems.map((item) => (
        <NavigationItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          description={isCollapsed ? undefined : item.description}
          isActive={activeTab === item.id}
          isCollapsed={isCollapsed}
          onClick={() => setActiveTab(item.id)}
        />
      ))}
    </div>
  );
};

// =============================================================================
// SECTION 2: HEADER CONTENT COMPONENT
// =============================================================================
// Header section with dynamic title and description, styled for theme compatibility
const HeaderContent = ({ activeTab }) => {
  const getTitle = () => {
    switch(activeTab) {
      case "backup": return "Backup Device";
      case "restore": return "Restore Device";
      case "history": return "Backup History";
      case "settings": return "Backup Settings";
      default: return "Backup Operations";
    }
  };

  const getDescription = () => {
    switch(activeTab) {
      case "backup": return "Create a backup of your device configuration";
      case "restore": return "Restore device configuration from a backup";
      case "history": return "View and manage backup history";
      case "settings": return "Configure backup settings and preferences";
      default: return "Manage device backups and restorations";
    }
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{getTitle()}</h1>
        <p className="text-sm text-muted-foreground">{getDescription()}</p>
      </div>
      <div className="flex items-center gap-2">
        {/* Additional action buttons can be added here */}
      </div>
    </div>
  );
};

// =============================================================================
// SECTION 3: MAIN CONTENT COMPONENTS
// =============================================================================
// Tab content components for different backup operations, styled with theme variables
const BackupTabContent = () => (
  <div className="space-y-6">
    <div className="grid gap-6 md:grid-cols-2">
      <DeviceTargetSelector
        title="Target Device"
        description="Select the device to back up"
        parameters={{}}
        onParamChange={() => {}}
        devices={[
          { id: "router-1", name: "Core Router (10.0.0.1)" },
          { id: "switch-1", name: "Access Switch (10.0.0.2)" },
          { id: "firewall-1", name: "Perimeter Firewall (10.0.0.3)" }
        ]}
      />
      <DeviceAuthFields
        title="Device Credentials"
        description="Authentication for the target device"
        parameters={{}}
        onParamChange={() => {}}
      />
    </div>
    <BackupForm />
  </div>
);

const RestoreTabContent = () => (
  <div className="p-6 text-center border border-dashed rounded-lg border-border bg-card text-card-foreground">
    <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
    <h3 className="text-lg font-medium mb-2 text-foreground">Restore Device Configuration</h3>
    <p className="text-muted-foreground mb-4">
      Select a backup file to restore to your device
    </p>
    {/* Restore functionality would be implemented here */}
  </div>
);

const HistoryTabContent = () => (
  <div className="p-6 text-center border border-dashed rounded-lg border-border bg-card text-card-foreground">
    <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
    <h3 className="text-lg font-medium mb-2 text-foreground">Backup History</h3>
    <p className="text-muted-foreground">
      View and manage your backup history
    </p>
    {/* Backup history table would be implemented here */}
  </div>
);

const SettingsTabContent = () => (
  <div className="p-6 text-center border border-dashed rounded-lg border-border bg-card text-card-foreground">
    <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
    <h3 className="text-lg font-medium mb-2 text-foreground">Backup Settings</h3>
    <p className="text-muted-foreground">
      Configure backup preferences and automation
    </p>
    {/* Settings form would be implemented here */}
  </div>
);

// =============================================================================
// SECTION 4: MAIN BACKUP COMPONENT
// =============================================================================
// Primary backup page component using WorkflowContainer with 71px offset for fixed header
function Backup() {
  const [activeTab, setActiveTab] = useState("backup");
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Tab configuration for the multi-tab interface
  const tabs = [
    {
      id: "backup",
      label: "Backup",
      content: <BackupTabContent />,
      icon: Download
    },
    {
      id: "restore",
      label: "Restore",
      content: <RestoreTabContent />,
      icon: Upload
    },
    {
      id: "history",
      label: "History",
      content: <HistoryTabContent />,
      icon: History
    },
    {
      id: "settings",
      label: "Settings",
      content: <SettingsTabContent />,
      icon: Settings
    }
  ];

  return (
    <WorkflowContainer
      sidebarContent={
        <SidebarContent 
          isCollapsed={isCollapsed}
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
      }
      sidebarHeader={
        <div className="flex items-center gap-3 p-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Database className="h-5 w-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-foreground">Backup Operations</h2>
              <p className="text-xs text-muted-foreground">Manage device backups</p>
            </div>
          )}
        </div>
      }
      headerContent={<HeaderContent activeTab={activeTab} />}
      mainContent={
        <div className="p-6" style={{ marginTop: '71px', paddingTop: '1.5rem' }}>
          <MultiTabInterface
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="cards"
            className="bg-card text-card-foreground"
          />
        </div>
      }
      defaultCollapsed={false}
      sidebarWidth="280px"
      className="min-h-screen bg-background text-foreground"
      onSidebarToggle={setIsCollapsed}
    />
  );
}

export default Backup;
