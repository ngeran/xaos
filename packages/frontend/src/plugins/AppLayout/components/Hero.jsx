/**
 * File Path: src/plugins/AppLayout/components/Hero.jsx
 * Version: 3.1.0
 * Description: Modern Hero banner for network automation dashboard.
 *              Features clean design with gradient background and professional typography.
 *
 * Key Features:
 * - Modern gradient background that works with any theme
 * - Clean, professional typography
 * - Responsive design for all screen sizes
 * - Self-contained styling without external dependencies
 * - Proper spacing below fixed navigation
 *
 * Detail How-To Guide:
 * 1. Place this component at the top of your main content area
 * 2. No external CSS variables required
 * 3. Customize content directly in the component
 * 4. Adjust padding/margins in the inline styles as needed
 *
 * Change Log:
 * - 3.1.0 (2025-09-14): Simplified styling, removed external CSS dependencies
 * - 3.0.2 (2023-10-27): Added margin-top for fixed header spacing
 * - 3.0.1 (2023-10-27): Updated documentation standards
 * - 3.0.0 (2023-10-20): Initial release
 */

import React from 'react';

const Hero = ({ className = '', style = {} }) => {
  const heroStyles = {
    section: {
      padding: '4rem 2rem',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      marginTop: '64px', // Account for fixed header
      position: 'relative',
      overflow: 'hidden'
    },
    content: {
      maxWidth: '960px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 2
    },
    heading: {
      fontSize: '3rem',
      fontWeight: '700',
      marginBottom: '1rem',
      lineHeight: '1.2',
      textShadow: '0 2px 4px rgba(0,0,0,0.3)'
    },
    subheading: {
      fontSize: '1.5rem',
      fontWeight: '300',
      opacity: '0.9',
      margin: '0.5rem auto 0',
      maxWidth: '760px',
      lineHeight: '1.6'
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.1)',
      zIndex: 1
    }
  };

  // Merge custom styles with defaults
  const mergedStyle = { ...heroStyles.section, ...style };

  return (
    <section
      className={`hero-section ${className}`}
      style={mergedStyle}
    >
      <div style={heroStyles.overlay}></div>
      <div style={heroStyles.content}>
        <h1 style={heroStyles.heading}>Network Automation & AI Agents</h1>
        <p style={heroStyles.subheading}>
          Intelligent orchestration, configuration, and analysis for your modern infrastructure.
        </p>
      </div>
    </section>
  );
};

Hero.displayName = 'Hero';
Hero.defaultProps = {
  className: '',
  style: {}
};

export default Hero;
