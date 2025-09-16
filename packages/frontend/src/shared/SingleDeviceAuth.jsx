/**
 * File Path: src/shared/SingleDeviceAuth.jsx
 * Version: 1.1.0
 * Description: Unified form for device authentication with hostname, username, and password.
 * 
 * Key Features:
 * - Single form combining hostname, username, and password inputs
 * - Real-time validation with visual feedback
 * - Password visibility toggle
 * - Responsive design for all screen sizes
 * - Supports both dark and light modes
 * 
 * How-To Guide:
 * 1. Import and use in forms requiring device authentication
 * 2. Pass parameters and onParamChange props from parent component
 * 3. Customize title and description as needed
 */

// =============================================================================
// IMPORTS SECTION - Dependencies and assets
// =============================================================================
import React, { useState } from "react";
import { Server, User, Lock, Eye, EyeOff, Shield } from "lucide-react";

// =============================================================================
// COMPONENT DEFINITION SECTION
// =============================================================================
// Unified device authentication form component
export default function SingleDeviceAuth({
  parameters = {},
  onParamChange = () => {},
  title = "Device Authentication",
  description = "Enter credentials and target device for secure access",
  className = ""
}) {
  // =============================================================================
  // STATE MANAGEMENT SECTION
  // =============================================================================
  // Tracks password visibility state
  const [showPassword, setShowPassword] = useState(false);

  // =============================================================================
  // EVENT HANDLERS SECTION
  // =============================================================================
  // Handles input changes for all fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    onParamChange(name, value);
  };

  // Toggles password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // =============================================================================
  // VALIDATION HELPERS SECTION
  // =============================================================================
  // Field validation states
  const hasValidHostname = parameters.hostname && parameters.hostname.trim() !== "";
  const hasValidUsername = parameters.username && parameters.username.trim() !== "";
  const hasValidPassword = parameters.password && parameters.password.trim() !== "";

  // =============================================================================
  // RENDER LOGIC SECTION
  // =============================================================================
  return (
    <div className={`single-device-auth ${className}`}>
      {/* HEADER SECTION - Title and security status */}
      <div className="auth-header">
        <div className="auth-header-content">
          <div className="auth-icon">
            <Shield className="h-4 w-4" />
          </div>
          <div className="auth-title">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        <div className="auth-status">
          <div className="status-indicator"></div>
          <span>Secure Connection</span>
        </div>
      </div>

      {/* FORM FIELDS SECTION - Input fields with validation */}
      <div className="auth-fields">
        <div className="auth-fields-grid">
          {/* Hostname Input Field */}
          <div className="auth-field-group">
            <div className="auth-input-wrapper">
              <input
                type="text"
                id="hostname"
                name="hostname"
                value={parameters.hostname || ""}
                onChange={handleChange}
                placeholder="e.g., router1.company.com"
                className={`auth-input ${hasValidHostname ? '' : 'auth-input-error'}`}
                aria-label="Target hostname"
              />
              <Server className={`auth-icon-input ${hasValidHostname ? '' : 'auth-icon-error'}`} />
            </div>
            {!hasValidHostname && (
              <p className="auth-error-message">Hostname required</p>
            )}
          </div>

          {/* Username Input Field */}
          <div className="auth-field-group">
            <div className="auth-input-wrapper">
              <input
                type="text"
                id="username"
                name="username"
                value={parameters.username || ""}
                onChange={handleChange}
                placeholder="Username"
                className={`auth-input ${hasValidUsername ? '' : 'auth-input-error'}`}
                aria-label="Username"
              />
              <User className={`auth-icon-input ${hasValidUsername ? '' : 'auth-icon-error'}`} />
            </div>
            {!hasValidUsername && (
              <p className="auth-error-message">Username required</p>
            )}
          </div>

          {/* Password Input Field */}
          <div className="auth-field-group">
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={parameters.password || ""}
                onChange={handleChange}
                placeholder="Password"
                className={`auth-input ${hasValidPassword ? '' : 'auth-input-error'}`}
                aria-label="Password"
              />
              <Lock className={`auth-icon-input ${hasValidPassword ? '' : 'auth-icon-error'}`} />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="auth-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!hasValidPassword && (
              <p className="auth-error-message">Password required</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
