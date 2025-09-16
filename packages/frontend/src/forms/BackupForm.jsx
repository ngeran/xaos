
/**
 * File Path: src/forms/BackupForm.jsx
 * Version: 1.2.0
 * Description: Combined form for device authentication in backup operations.
 * 
 * Key Features:
 * - Integrates modern DeviceAuthFields for authentication
 * - Real-time validation with visual feedback
 * - Responsive design for all screen sizes
 * - Supports both dark and light modes
 * 
 * How-To Guide:
 * 1. Import and use in backup-related components
 * 2. Pass parameters and onParamChange props from parent component
 * 3. Styling is handled by backup.css
 */

import React from "react";
import DeviceAuthFields from "../shared/DeviceAuthFields"; 
import DeviceTargetSelector from "../shared/DeviceTargetSelector";
// Replaced SingleDeviceAuth with DeviceAuthFields for a modern UI

// =============================================================================
// COMPONENT DEFINITION SECTION
// =============================================================================
// Combines device authentication fields for backup operations
function BackupForm({ parameters, onParamChange }) {
  return (
    <div className="backup-form">
      {/* AUTHENTICATION FIELDS COMPONENT */}
      <DeviceAuthFields
        parameters={parameters}
        onParamChange={onParamChange}
        title="Device Authentication"
        description="Enter credentials for the device you want to backup"
      />
    </div>
  );
}

export default BackupForm;
