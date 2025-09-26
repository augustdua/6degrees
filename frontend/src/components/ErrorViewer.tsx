import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Copy, Trash2, Download, RefreshCw } from 'lucide-react';
import { errorTracker } from '@/utils/errorTracker';
import { useToast } from '@/hooks/use-toast';

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

const ErrorViewer = () => {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const { toast } = useToast();

  const loadErrors = () => {
    const storedErrors = errorTracker.getStoredErrors();
    setErrors(storedErrors);
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Error details copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const clearAllErrors = () => {
    errorTracker.clearStoredErrors();
    setErrors([]);
    setSelectedError(null);
    toast({
      title: "Errors cleared",
      description: "All stored errors have been cleared",
    });
  };

  const downloadErrorsAsJson = () => {
    const dataStr = JSON.stringify(errors, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `error-reports-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Download started",
      description: "Error reports downloaded as JSON file",
    });
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'javascript_error': return 'destructive';
      case 'unhandled_promise': return 'destructive';
      case 'console_error': return 'secondary';
      case 'react_error': return 'destructive';
      default: return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Debug Viewer
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadErrors}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
              {errors.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadErrorsAsJson}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllErrors}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All
                  </Button>
                </>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing {errors.length} stored error reports from this device
          </p>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No errors found</h3>
              <p className="text-muted-foreground">
                No errors have been captured yet. This is good news!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Error List */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Error Reports ({errors.length})</h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {errors.map((error, index) => (
                      <Card
                        key={index}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedError === error ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedError(error)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant={getErrorTypeColor(error.type)} className="text-xs">
                              {error.type.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(error.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm font-medium line-clamp-2 mb-1">
                            {error.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{error.deviceInfo.platform}</span>
                            <span>•</span>
                            <span>{error.deviceInfo.browser}</span>
                            {error.deviceInfo.isMobile && (
                              <>
                                <span>•</span>
                                <span>📱 Mobile</span>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Error Details */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Error Details</h3>
                {selectedError ? (
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <Badge variant={getErrorTypeColor(selectedError.type)}>
                            {selectedError.type.replace('_', ' ')}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(selectedError, null, 2))}
                            className="flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </Button>
                        </div>

                        <div>
                          <h4 className="font-medium mb-1">Message</h4>
                          <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            {selectedError.message}
                          </p>
                        </div>

                        {selectedError.stack && (
                          <div>
                            <h4 className="font-medium mb-1">Stack Trace</h4>
                            <ScrollArea className="h-32">
                              <pre className="text-xs text-muted-foreground bg-muted p-2 rounded whitespace-pre-wrap">
                                {selectedError.stack}
                              </pre>
                            </ScrollArea>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium mb-1">Device Info</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Platform:</strong> {selectedError.deviceInfo.platform}</p>
                            <p><strong>Browser:</strong> {selectedError.deviceInfo.browser}</p>
                            <p><strong>Mobile:</strong> {selectedError.deviceInfo.isMobile ? 'Yes' : 'No'}</p>
                            <p><strong>Screen:</strong> {selectedError.deviceInfo.screenSize}</p>
                            <p><strong>Viewport:</strong> {selectedError.deviceInfo.viewportSize}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-1">Metadata</h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Timestamp:</strong> {formatTimestamp(selectedError.timestamp)}</p>
                            <p><strong>URL:</strong> {selectedError.url}</p>
                            {selectedError.userId && (
                              <p><strong>User ID:</strong> {selectedError.userId}</p>
                            )}
                          </div>
                        </div>

                        {selectedError.additionalInfo && (
                          <div>
                            <h4 className="font-medium mb-1">Additional Info</h4>
                            <ScrollArea className="h-20">
                              <pre className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                {JSON.stringify(selectedError.additionalInfo, null, 2)}
                              </pre>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">
                        Select an error from the list to view details
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorViewer;