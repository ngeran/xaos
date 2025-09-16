/**
 * File Path: src/plugins/AppLayout/components/Footer.jsx
 * Version: 2.0.2
 * Description: Footer component that uses correct class names matching original HTML.
 */

import React from 'react';
import { useLayoutContext } from '../AppLayout.jsx';
import './footer.css';

// ================================================
// FOOTER COMPONENT
// ================================================

const Footer = ({
  config,
  isMobile,
  onError,
  className = '',
  style = {}
}) => {
  // ================================================
  // CONTEXT & THEME
  // ================================================

  // Get theme from layout context to respond to theme changes
  const layoutContext = useLayoutContext();
  const { theme } = layoutContext;

  // ================================================
  // RENDER FUNCTIONS
  // ================================================

  const renderSeparator = () => (
    <div className="footer-separator"></div>
  );

  const renderLogo = () => (
    <a href="/" aria-current="page" className="footer-logo-link">
      <img 
        src="https://cdn.prod.website-files.com/66e53bf67b6fc1646ce0777e/66e55b9f58de957ca8d85785_Effortel_logo.svg"
        loading="eager"
        alt="Effortel Logo"
        className="effortel__logo"
      />
    </a>
  );

  const renderCopyright = () => (
    <div className="copyright">©2025 Effortel</div>
  );

  const renderDesignerAttribution = () => (
    <a
      href="https://www.onioncreative.studio/"
      target="_blank"
      rel="noopener noreferrer"
      className="is-footer-link"
    >
      Design & Dev by <span className="ext__link">Onion</span>
    </a>
  );

  // ================================================
  // MAIN RENDER
  // ================================================

  return (
    <footer className={`footer ${className}`} style={style} data-theme={theme}>
      {renderSeparator()}
      <div className="container">
        <div className="footer-content">
          <div className="flex-between is-footer">
            {renderLogo()}
            {renderCopyright()}
            {renderDesignerAttribution()}
          </div>
        </div>
      </div>
    </footer>
  );
};

// ================================================
// COMPONENT METADATA
// ================================================

Footer.displayName = 'Footer';

Footer.defaultProps = {
  config: {},
  isMobile: false,
  className: '',
  style: {},
  onError: () => {}
};

export default Footer;
