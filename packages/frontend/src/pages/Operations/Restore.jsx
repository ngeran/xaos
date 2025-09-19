import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import DeviceTargetSelector from '@/shared/DeviceTargetSelector';
import DeviceAuthFields from '@/shared/DeviceAuthFields';

/**
 * File Path: src/pages/Operations/Restore.jsx
 * Version: 1.2.1
 * 
 * Description:
 * Device restoration tool component providing a three-step workflow for restoring
 * device configurations. Implements a simple interface for seamless navigation
 * between device selection, execution, and results review.
 * 
 * Key Features:
 * - Three-phase restoration workflow: Selection → Execution → Results
 * - Integrated device selection with authentication validation
 * - Real-time progress visualization during restoration
 * - Comprehensive results reporting with success/failure states
 * - Full dark/light theme compatibility
 * - State persistence across view changes
 * 
 * Component Hierarchy:
 * - Integrates DeviceTargetSelector for device selection
 * - Incorporates DeviceAuthFields for authentication
 * - Uses UI components from @/components/ui
 * 
 * Dependencies:
 * - @/shared/DeviceTargetSelector: Device selection component  
 * - @/shared/DeviceAuthFields: Authentication form component
 * - @/components/ui/button: Button UI component
 * 
 * State Management:
 * - currentStep: Controls currently active step (1-3)
 * - restoreStatus: Tracks restoration outcome
 * - deviceParams: Stores parameters for DeviceTargetSelector
 * - authParams: Holds authentication credentials for DeviceAuthFields
 * - progress: Tracks execution progress percentage
 * 
 * Bug Fix Notes:
 * - Removed MultiTabInterface dependency to eliminate component remounting issues
 * - Replaced with simple step-based navigation
 * - This prevents dropdown/input field interaction problems
 * - Components now maintain their internal state properly
 * 
 * Usage:
 * ```jsx
 * import Restore from '@/pages/Operations/Restore';
 * 
 * <Restore />
 * ```
 */
const Restore = () => {
  // --- State Management ---
  const [currentStep, setCurrentStep] = useState(1);
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [deviceParams, setDeviceParams] = useState({ // Renamed from selectedDevice
    hostname: '',
    inventory_file: ''
  });
  const [authParams, setAuthParams] = useState({ // Renamed from authData
    username: '',
    password: ''
  });
  const [progress, setProgress] = useState(0);

  // --- Handler Functions ---
  /**
   * Handles authentication data changes from DeviceAuthFields
   * 
   * @function handleAuthParamChange
   * @param {string} name - The name of the parameter (e.g., 'username', 'password')
   * @param {string} value - The new value of the parameter
   * @returns {void}
   */
  const handleAuthParamChange = (name, value) => {
    console.log(`Auth param update: ${name}: ${value}`); // Debug log
    setAuthParams(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Handles device selection/input changes from DeviceTargetSelector
   * 
   * @function handleDeviceParamChange
   * @param {string} name - The name of the parameter (e.g., 'hostname', 'inventory_file')
   * @param {string} value - The new value of the parameter
   * @returns {void}
   */
  const handleDeviceParamChange = (name, value) => {
    console.log(`Device param update: ${name}: ${value}`); // Debug log
    setDeviceParams(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Initiates the device restoration process
   * Transitions to step 2 (execution) and simulates restoration progress
   * 
   * @function handleRestore
   * @returns {void}
   */
  const handleRestore = () => {
    // Transition to Execute step
    setCurrentStep(2);
    setProgress(0);
    
    // Simulate restore process with progress updates
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setRestoreStatus('success');
          setCurrentStep(3);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  /**
   * Resets the restoration tool to initial state
   * Clears all user inputs and returns to step 1
   * 
   * @function handleReset
   * @returns {void}
   */
  const handleReset = () => {
    setCurrentStep(1);
    setRestoreStatus(null);
    setDeviceParams({ hostname: '', inventory_file: '' });
    setAuthParams({ username: '', password: '' });
    setProgress(0);
  };

  // Determine if DeviceTargetSelector has a valid selection
  const isDeviceTargetSelected = (deviceParams.hostname?.trim().length > 0 || deviceParams.inventory_file?.trim().length > 0);
  // Determine if DeviceAuthFields has valid credentials
  const areAuthFieldsValid = (authParams.username?.trim().length > 0 && authParams.password?.trim().length > 0);

  // --- Render Step Content ---
  /**
   * Renders content based on current step
   * 
   * @function renderStepContent
   * @returns {React.ReactNode}
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Device Selection</h3>
              <DeviceTargetSelector 
                parameters={deviceParams} // Correct prop name
                onParamChange={handleDeviceParamChange} // Correct prop name
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Authentication</h3>
              <DeviceAuthFields 
                parameters={authParams} // Correct prop name
                onParamChange={handleAuthParamChange} // Correct prop name
              />
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleRestore}
                disabled={!isDeviceTargetSelected || !areAuthFieldsValid}
              >
                Start Restore Process
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-medium">Restoration in Progress</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Restoring device configuration...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Please do not close this window during the restoration process.</p>
              <p>This may take several minutes to complete.</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-medium">Restoration Results</h3>
            
            {restoreStatus === 'success' ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
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
                
                <div className="bg-muted p-4 rounded-md">
                  <h4 className="font-medium mb-2">Details:</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex">
                      <span className="w-32 text-muted-foreground">Target:</span>
                      <span>
                        {deviceParams.hostname || deviceParams.inventory_file.replace('.yaml', '').replace('.yml', '') || 'Unknown'}
                      </span>
                    </li>
                    <li className="flex">
                      <span className="w-32 text-muted-foreground">Timestamp:</span>
                      <span>{new Date().toLocaleString()}</span>
                    </li>
                    <li className="flex">
                      <span className="w-32 text-muted-foreground">Status:</span>
                      <span className="text-green-600 dark:text-green-400">Completed successfully</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <Button onClick={handleReset}>
                Start New Restoration
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // --- Main Component Render ---
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-background text-foreground">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Device Configuration Restore Tool</h2>
        <p className="text-muted-foreground">Restore device configurations from backup files</p>
      </div>
      
      {/* Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep === step 
                  ? 'bg-primary text-primary-foreground' 
                  : currentStep > step 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted text-muted-foreground'
                }
              `}>
                {currentStep > step ? '✓' : step}
              </div>
              <span className={`ml-2 text-sm ${
                currentStep === step ? 'font-medium' : 'text-muted-foreground'
              }`}>
                {step === 1 ? 'Select' : step === 2 ? 'Execute' : 'Results'}
              </span>
              {step < 3 && (
                <div className={`w-12 h-px mx-4 ${
                  currentStep > step ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step Content */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default Restore;
