/**
 * File Path: src/plugins/AppLayout/components/Content.jsx
 * Version: 1.2.0
 * Description: Main content component that handles application routing.
 *              Now exclusively focuses on routing without development content.
 * 
 * How to Use:
 * 1. Rendered within AppLayout component as children
 * 2. Receives props from parent AppLayout component
 * 3. Handles page routing and passes props to appropriate pages
 * 
 * How to Add a New Page:
 * 1. Create page component in src/pages/ (e.g., src/pages/NewPage.jsx)
 * 2. Import it in this file
 * 3. Add a Route component: <Route path="/your-path" element={<NewPage />} />
 * 
 * Change Log:
 * v1.2.0 (2025-09-14): Removed development content, now focuses exclusively on routing
 * v1.1.0 (2025-09-14): Added basic routing for Backup page
 * v1.0.0 - Initial implementation with content sections and development tools
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import pages
import Home from '../../../pages/Home.jsx';
import Backup from '../../../pages/Operations/Backup.jsx';

// ================================================
// CONTENT COMPONENT
// ================================================

const Content = ({
  plugins = {},
  backendAvailable = false,
  appState = {},
  onToggleBackend,
  onRestartPlugins,
  onLogState,
  className = '',
  style = {}
}) => {
  // ================================================
  // ROUTING CONFIGURATION - ADD NEW ROUTES HERE
  // ================================================
  
  const renderRoutes = () => (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <Home 
              plugins={plugins}
              backendAvailable={backendAvailable}
              appState={appState}
              onToggleBackend={onToggleBackend}
              onRestartPlugins={onRestartPlugins}
              onLogState={onLogState}
            />
          } 
        />
        <Route path="/operations/backups" element={<Backup />} />
        {/* Add new routes here following the same pattern */}
      </Routes>
    </BrowserRouter>
  );

  // ================================================
  // MAIN RENDER
  // ================================================

  const contentClasses = [
    'app-content',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={contentClasses}
      style={style}
      data-component="content"
      data-version="1.2.0"
    >
      {/* Render the current page based on route */}
      {renderRoutes()}
    </div>
  );
};

// ================================================
// COMPONENT METADATA
// ================================================

Content.displayName = 'Content';

Content.defaultProps = {
  plugins: {},
  backendAvailable: false,
  appState: {},
  className: '',
  style: {}
};

// ================================================
// EXPORTS
// ================================================

export default Content;
