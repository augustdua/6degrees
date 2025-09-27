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
    // Temporarily disable error tracking to prevent infinite loops
    this.isEnabled = false;
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
    // Intercept console.error calls
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Call original console.error first
      originalConsoleError.apply(console, args);

      // Track the error
      this.reportError({
        type: 'console_error',
        message: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '),
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        deviceInfo: this.getDeviceInfo(),
        additionalInfo: {
          arguments: args,
        }
      });
    };

    // Intercept console.warn calls (optional)
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args);

      // Only track warnings that look like errors
      const message = args.join(' ');
      if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
        this.reportError({
          type: 'console_error',
          message: `[WARN] ${message}`,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userId: this.userId,
          deviceInfo: this.getDeviceInfo(),
          additionalInfo: {
            level: 'warning',
            arguments: args,
          }
        });
      }
    };
  }

  private originalConsoleError = console.error;

  private async reportError(errorReport: ErrorReport) {
    if (!this.isEnabled) return;

    const now = Date.now();
    
    // Circuit breaker: prevent infinite error reporting loops
    if (now - this.lastErrorReportTime > 60000) { // Reset counter every minute
      this.errorReportCount = 0;
    }
    
    // Rate limiting: prevent too many errors in a short time
    if (this.errorReportCount >= this.MAX_ERROR_REPORTS_PER_MINUTE) {
      return; // Silently drop errors when rate limited
    }
    
    // Minimum interval between errors
    if (now - this.lastErrorTime < this.MIN_ERROR_INTERVAL) {
      return; // Silently drop errors that are too frequent
    }

    // Increment counters
    this.errorReportCount++;
    this.lastErrorReportTime = now;
    this.lastErrorTime = now;

    try {
      // Log to console for immediate debugging using original console.error to avoid infinite loop
      console.group(`🚨 ERROR TRACKED [${errorReport.type}]`);
      this.originalConsoleError('Message:', errorReport.message);
      this.originalConsoleError('Stack:', errorReport.stack);
      this.originalConsoleError('Device:', errorReport.deviceInfo);
      this.originalConsoleError('User Agent:', errorReport.userAgent);
      this.originalConsoleError('URL:', errorReport.url);
      this.originalConsoleError('Timestamp:', errorReport.timestamp);
      this.originalConsoleError('Additional Info:', errorReport.additionalInfo);
      console.groupEnd();

      // Send to backend with timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api.6degree.app'}/api/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.originalConsoleError('[WARN] Failed to send error report to backend');
      }
    } catch (reportingError) {
      // Only log if it's not an abort error (timeout)
      if (reportingError.name !== 'AbortError') {
        this.originalConsoleError('Error reporting failed:', reportingError);
      }
    }

    // Also store in localStorage as backup
    this.storeErrorLocally(errorReport);
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