
/**
 * =============================================================================
 * DEVICE TARGET SELECTOR COMPONENT
 * =============================================================================
 *
 * DESCRIPTION:
 * A reusable device target selection component that allows users to specify
 * which device they want to operate on. Designed with accessibility, modern UI,
 * and responsive behavior in mind.
 *
 * KEY FEATURES:
 * • Dropdown selector for available devices
 * • Support for dynamic device list (passed via props)
 * • Validation feedback when no device is selected
 * • Accessible ARIA labels for improved usability
 * • Responsive design for desktop and mobile views
 * • Consistent glassmorphism-inspired design to match DeviceAuthFields
 *
 * DEPENDENCIES:
 * • react: ^18.0.0 (useState hook for state management)
 * • lucide-react: ^0.263.1 (Server, AlertCircle icons)
 * • tailwindcss: ^3.0.0 (utility-first CSS framework)
 *
 * HOW TO USE:
 * ```jsx
 * import DeviceTargetSelector from "../shared/DeviceTargetSelector";
 *
 * function MyApp() {
 *   const [params, setParams] = useState({});
 *
 *   const handleParamChange = (name, value) => {
 *     setParams(prev => ({ ...prev, [name]: value }));
 *   };
 *
 *   return (
 *     <DeviceTargetSelector
 *       parameters={params}
 *       onParamChange={handleParamChange}
 *       devices={[
 *         { id: "r1", name: "Router 1" },
 *         { id: "sw1", name: "Switch 1" },
 *       ]}
 *       title="Target Device"
 *       description="Select the device to back up"
 *     />
 *   );
 * }
 * ```
 */

import React from "react";
import { Server, AlertCircle } from "lucide-react";

// =============================================================================
// MAIN COMPONENT EXPORT
// =============================================================================
// Primary target device selection component with validation and modern UI
export default function DeviceTargetSelector({
  parameters = {},
  onParamChange = () => {},
  devices = [],
  title = "Device Selection",
  description = "Choose the device you want to operate on",
  className = ""
}) {
  // =============================================================================
  // VALIDATION LOGIC SECTION
  // =============================================================================
  const isTargetValid = parameters.target?.trim().length > 0;

  // =============================================================================
  // EVENT HANDLERS SECTION
  // =============================================================================
  const handleChange = (e) => {
    onParamChange("target", e.target.value);
  };

  // =============================================================================
  // COMPONENT RENDER SECTION
  // =============================================================================
  return (
    <div
      className={`
        bg-card border rounded-xl shadow-sm backdrop-blur-sm
        ${className}
      `.trim()}
    >
      {/* HEADER SECTION */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Server className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      {/* SELECT FIELD SECTION */}
      <div className="p-6">
        <div className="space-y-2">
          <div className="relative">
            <select
              name="target"
              value={parameters.target || ""}
              onChange={handleChange}
              className={`
                w-full pl-10 pr-4 py-3 text-sm
                border rounded-lg transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                hover:border-muted-foreground/50
                ${isTargetValid
                  ? "border-border bg-background"
                  : "border-destructive/50 bg-destructive/5 focus:ring-destructive/20"}
              `}
              aria-describedby={!isTargetValid ? "target-error" : undefined}
            >
              <option value="">-- Select a device --</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
            <Server
              className={`
                absolute left-3 top-3 h-4 w-4 transition-colors duration-200
                ${isTargetValid ? "text-muted-foreground" : "text-destructive"}
              `}
            />
          </div>
          {!isTargetValid && (
            <p
              id="target-error"
              className="flex items-center gap-1 text-xs text-destructive animate-in fade-in duration-200"
            >
              <AlertCircle className="h-3 w-3" /> Target device is required
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
