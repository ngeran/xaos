/**
 * File Path: src/plugins/AppLayout/components/MainContent.jsx
 * Version: 3.0.0
 * Description: Main content container with an elegant, professional aesthetic,
 *              designed for clarity and seamless integration with the application theme.
 */

import React from 'react';
import { useLayoutContext } from '../AppLayout.jsx';
import './maincontent.css';

// =============================================================
// MAIN CONTENT COMPONENT
// =============================================================

const MainContent = ({ children, className = '', style = {} }) => {
  const { theme } = useLayoutContext();

  return (
    <main
      className={`app-main-content ${className}`}
      style={style}
      data-theme={theme}
    >
      <div className="app-main-inner">
        {children}
      </div>
    </main>
  );
};

// =============================================================
// COMPONENT METADATA
// =============================================================

MainContent.displayName = 'MainContent';

MainContent.defaultProps = {
  className: '',
  style: {},
  children: null
};

export default MainContent;
