/**
 * Global Error Tracking System
 * Captures JavaScript errors, unhandled promises, and console errors
 * Especially useful for debugging mobile device issues
 */

interface ErrorReport {
  type: 'javascript_error' | 'unhandled_promise' | 'console_error' | 'react_error';
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  timestamp: string;
  userId?: string;
  deviceInfo: {
    isMobile: boolean;
    platform: string;
    browser: string;
    screenSize: string;
    viewportSize: string;
  };
  additionalInfo?: any;
}

class ErrorTracker {
  private userId?: string;
  private isEnabled: boolean = true;
  private errorReportCount = 0;
  private lastErrorReportTime = 0;
  private readonly MAX_ERROR_REPORTS_PER_MINUTE = 3; // Reduced from 5
  private readonly MIN_ERROR_INTERVAL = 1000; // Minimum 1 second between error reports
  private lastErrorTime = 0;

  constructor() {
    // Completely disable error tracking to prevent infinite loops
    this.isEnabled = false;
    // Keep console clean in production.
    // this.setupGlobalErrorHandlers();
    // this.interceptConsoleErrors();
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    let platform = 'Unknown';
    if (userAgent.includes('Windows')) platform = 'Windows';
    else if (userAgent.includes('Mac')) platform = 'Mac';
    else if (userAgent.includes('Linux')) platform = 'Linux';
    else if (userAgent.includes('Android')) platform = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS';

    let browser = 'Unknown';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';

    return {
      isMobile,
      platform,
      browser,
      screenSize: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  private setupGlobalErrorHandlers() {
    // Catch JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        type: 'javascript_error',
        message: event.message,
        stack: event.error?.stack,
        userAgent: navigator.userAgent,
        url: event.filename || window.location.href,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        deviceInfo: this.getDeviceInfo(),
        additionalInfo: {
          lineno: event.lineno,
          colno: event.colno,
          filename: event.filename,
        }
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        type: 'unhandled_promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        deviceInfo: this.getDeviceInfo(),
        additionalInfo: {
          reason: event.reason,
        }
      });
    });
  }

  private interceptConsoleErrors() {
    // DISABLED: Console interception causes infinite loops
    console.log('🚫 Console error interception disabled to prevent infinite loops');
    return;
  }

  private originalConsoleError = console.error;

  private async reportError(errorReport: ErrorReport) {
    // Completely disabled to prevent infinite loops
    return;
  }

  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      const key = 'error_reports';
      const existing = localStorage.getItem(key);
      const reports = existing ? JSON.parse(existing) : [];

      reports.push(errorReport);

      // Keep only last 50 errors to avoid storage bloat
      if (reports.length > 50) {
        reports.splice(0, reports.length - 50);
      }

      localStorage.setItem(key, JSON.stringify(reports));
    } catch (storageError) {
      this.originalConsoleError('Failed to store error locally:', storageError);
    }
  }

  // Method to get stored errors for debugging
  getStoredErrors(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('error_reports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Method to clear stored errors
  clearStoredErrors() {
    localStorage.removeItem('error_reports');
  }

  // Method to manually report an error
  reportManualError(message: string, additionalInfo?: any) {
    this.reportError({
      type: 'react_error',
      message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      deviceInfo: this.getDeviceInfo(),
      additionalInfo,
    });
  }

  // Disable/enable error tracking
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

// Create global instance
export const errorTracker = new ErrorTracker();

// React Error Boundary compatible error reporter
export const reportReactError = (error: Error, errorInfo: any) => {
  errorTracker.reportManualError(error.message, {
    stack: error.stack,
    errorInfo,
    errorBoundary: true,
  });
};

export default errorTracker;