/**
 * File Path: src/pages/Home.jsx
 * Version: 3.0.0
 * Description: Home page component for XAOS Network Automation Dashboard.
 *              Features a modern hero section, dashboard overview, and development tools.
 * 
 * Key Features:
 * - Modern network automation dashboard design
 * - Real-time system status overview
 * - Plugin ecosystem visualization
 * - Development tools for testing and debugging
 * - Responsive design with dark/light theme support
 * - Animated statistics and metrics display
 * 
 * How to Use:
 * 1. This component is automatically rendered when users visit the root path ("/")
 * 2. Receives props from the parent Content component including plugin data and callbacks
 * 3. Development tools are automatically hidden in production builds
 * 4. Dashboard metrics update in real-time based on system status
 * 
 * Example Usage:
 * <Home 
 *   plugins={plugins}
 *   backendAvailable={backendAvailable}
 *   appState={appState}
 *   onToggleBackend={onToggleBackend}
 *   onRestartPlugins={onRestartPlugins}
 *   onLogState={onLogState}
 * />
 * 
 * Change Log:
 * v3.0.0 (2025-09-14): Complete redesign with Network Automation Dashboard theme
 * v2.0.0 (2025-09-14): Added Hero component and development content from Content.jsx
 * v1.0.0 - Initial implementation with basic welcome message
 */

import React, { useState, useEffect } from 'react';
import Hero from '../plugins/AppLayout/components/Hero.jsx';
import '../plugins/AppLayout/components/content.css';
import './home.css';

// ================================================
// HOME PAGE COMPONENT
// ================================================

const Home = ({
  plugins = {},
  backendAvailable = false,
  appState = {},
  onToggleBackend,
  onRestartPlugins,
  onLogState
}) => {
  // ================================================
  // STATE MANAGEMENT
  // ================================================

  const [dashboardStats, setDashboardStats] = useState({
    activeDevices: 0,
    networkHealth: 100,
    automationRuns: 0,
    pluginsLoaded: Object.keys(plugins).length
  });

  const [isLoading, setIsLoading] = useState(true);

  // ================================================
  // EFFECTS & DATA INITIALIZATION
  // ================================================

  useEffect(() => {
    // Simulate loading dashboard data
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setDashboardStats({
        activeDevices: backendAvailable ? 42 : 0,
        networkHealth: backendAvailable ? 98 : 0,
        automationRuns: backendAvailable ? 127 : 0,
        pluginsLoaded: Object.keys(plugins).length
      });
      
      setIsLoading(false);
    };

    loadDashboardData();
  }, [backendAvailable, plugins]);

  // ================================================
  // DASHBOARD COMPONENTS
  // ================================================

  /**
   * Renders dashboard statistics cards with animated counters
   */
  const renderDashboardStats = () => (
    <div className="dashboard-stats-grid">
      <div className="stat-card">
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M8 10L12 14L16 10" stroke="currentColor" strokeWidth="2"/>
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <div className="stat-content">
          <h3>Active Devices</h3>
          <div className="stat-value">
            {isLoading ? (
              <div className="loading-pulse">--</div>
            ) : (
              dashboardStats.activeDevices
            )}
          </div>
          <div className="stat-trend">
            <span className="trend-up">+12% this week</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <div className="stat-content">
          <h3>Network Health</h3>
          <div className="stat-value">
            {isLoading ? (
              <div className="loading-pulse">--</div>
            ) : (
              <>
                {dashboardStats.networkHealth}%
                <div className="health-indicator">
                  <div 
                    className="health-bar" 
                    style={{ width: `${dashboardStats.networkHealth}%` }}
                  ></div>
                </div>
              </>
            )}
          </div>
          <div className="stat-trend">
            <span className="trend-stable">Stable</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <div className="stat-content">
          <h3>Automation Runs</h3>
          <div className="stat-value">
            {isLoading ? (
              <div className="loading-pulse">--</div>
            ) : (
              dashboardStats.automationRuns
            )}
          </div>
          <div className="stat-trend">
            <span className="trend-up">+8 today</span>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V5Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 12H15" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 8H15" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 16H12" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <div className="stat-content">
          <h3>Plugins Loaded</h3>
          <div className="stat-value">
            {isLoading ? (
              <div className="loading-pulse">--</div>
            ) : (
              dashboardStats.pluginsLoaded
            )}
          </div>
          <div className="stat-trend">
            <span className="trend-neutral">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Renders quick action buttons for common tasks
   */
  const renderQuickActions = () => (
    <div className="quick-actions">
      <h3>Quick Actions</h3>
      <div className="action-buttons">
        <button className="action-btn primary">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2"/>
          </svg>
          New Automation
        </button>
        <button className="action-btn secondary">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M15 12L8 12" stroke="currentColor" strokeWidth="2"/>
            <path d="M15 8L8 8" stroke="currentColor" strokeWidth="2"/>
            <path d="M15 16L8 16" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Device Groups
        </button>
        <button className="action-btn tertiary">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M10 12C10 13.1046 10.8954 14 12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 14V18" stroke="currentColor" strokeWidth="2"/>
            <path d="M3 12C3 4.5885 4.5885 3 12 3C19.4115 3 21 4.5885 21 12C21 19.4115 19.4115 21 12 21C4.5885 21 3 19.4115 3 12Z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Monitoring
        </button>
      </div>
    </div>
  );

  /**
   * Renders plugin ecosystem visualization
   */
  const renderPluginEcosystem = () => (
    <div className="plugin-ecosystem">
      <div className="section-header">
        <h2>Plugin Ecosystem</h2>
        <p>Extend your network automation capabilities with modular plugins</p>
      </div>
      
      <div className="plugins-grid">
        {Object.entries(plugins).map(([pluginId, plugin]) => (
          <div key={pluginId} className="plugin-card">
            <div className="plugin-icon">
              <div className={`status-indicator ${plugin.state === 'loaded' ? 'active' : 'inactive'}`}></div>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 12H16M8 8H16M8 16H12" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="plugin-content">
              <h4>{pluginId}</h4>
              <div className="plugin-meta">
                <span className="plugin-type">{plugin.type}</span>
                <span className={`plugin-status ${plugin.state}`}>{plugin.state}</span>
              </div>
              <div className="plugin-connection">
                <div className={`connection-dot ${plugin.backendAvailable ? 'connected' : 'disconnected'}`}></div>
                {plugin.backendAvailable ? 'Connected' : 'Offline'}
              </div>
            </div>
          </div>
        ))}
        
        {Object.keys(plugins).length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <p>No plugins loaded. Check your configuration or install plugins.</p>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Renders development tools panel
   */
  const renderDevTools = () => (
    <div className="dev-tools-panel">
      <div className="panel-header">
        <h3>Development Tools</h3>
        <span className="badge">Development Mode</span>
      </div>
      
      <div className="tool-grid">
        <button 
          onClick={() => onLogState?.('appState')}
          className="tool-btn diagnostic"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Diagnostics
        </button>
        
        <button 
          onClick={() => onLogState?.('plugins')}
          className="tool-btn plugins"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Plugin State
        </button>
        
        <button 
          onClick={() => onRestartPlugins?.()}
          className="tool-btn restart"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2"/>
            <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2"/>
            <path d="M20.49 9C19.9828 7.56678 19.1209 6.2854 17.9845 5.27542C16.8482 4.26545 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1113 10.0083 20.7757C8.52547 20.4402 7.1518 19.7346 6.01547 18.7246C4.87914 17.7146 4.01717 16.4332 3.51 15" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Restart System
        </button>
        
        <button 
          onClick={() => onToggleBackend?.()}
          className={`tool-btn ${backendAvailable ? 'connected' : 'disconnected'}`}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 12.55C6.976 10.186 9.482 9 12 9C14.518 9 17.024 10.186 19 12.55" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 15.45C8.976 14.431 10.482 14 12 14C13.518 14 15.024 14.431 16 15.45" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="18" r="1" fill="currentColor"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Backend: {backendAvailable ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );

  // ================================================
  // MAIN RENDER
  // ================================================

  return (
    <div className="home-page">
      {/* Hero Section */}
      <Hero />

      {/* Main Content */}
      <div className="dashboard-container">
        {/* Welcome Header */}
        <div className="welcome-header">
          <h1>Network Automation Dashboard</h1>
          <p>Monitor, manage, and automate your network infrastructure</p>
        </div>

        {/* Dashboard Statistics */}
        {renderDashboardStats()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Plugin Ecosystem */}
        {renderPluginEcosystem()}

        {/* Development Tools (Development Mode Only) */}
        {import.meta.env.MODE === 'development' && renderDevTools()}

        {/* System Status Footer */}
        <div className="system-status">
          <div className="status-item">
            <div className={`status-dot ${backendAvailable ? 'online' : 'offline'}`}></div>
            Backend Service: {backendAvailable ? 'Online' : 'Offline'}
          </div>
          <div className="status-item">
            <div className="status-dot online"></div>
            Web Interface: Operational
          </div>
          <div className="status-item">
            <div className="status-dot online"></div>
            Plugin System: Ready
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================
// DEFAULT PROPS
// ================================================

Home.defaultProps = {
  plugins: {},
  backendAvailable: false,
  appState: {},
  onToggleBackend: () => {},
  onRestartPlugins: () => {},
  onLogState: () => {}
};

// ================================================
// EXPORT
// ================================================

export default Home;
