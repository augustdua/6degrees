import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Send, HelpCircle, Lightbulb, Bug, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'help' | 'suggestions'>('help');
  const [suggestionType, setSuggestionType] = useState('');
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitSuggestion = async () => {
    if (!suggestionType || !suggestionTitle || !suggestionDescription) return;

    setSubmitting(true);
    try {
      // In a real app, you'd send this to your backend
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Suggestion submitted:', {
        type: suggestionType,
        title: suggestionTitle,
        description: suggestionDescription,
        timestamp: new Date().toISOString()
      });
      
      setSubmitted(true);
      setSuggestionType('');
      setSuggestionTitle('');
      setSuggestionDescription('');
    } catch (error) {
      console.error('Error submitting suggestion:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setActiveTab('help');
    setSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help & Support
          </DialogTitle>
          <DialogDescription>
            Get help with using 6Degrees or share your suggestions for improvement
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex bg-muted rounded-lg p-1 mb-6">
          <Button
            variant={activeTab === 'help' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('help')}
            className="flex-1"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
          <Button
            variant={activeTab === 'suggestions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('suggestions')}
            className="flex-1"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Suggestions
          </Button>
        </div>

        {/* Help Tab */}
        {activeTab === 'help' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium">How to create a connection request:</h4>
                  <p className="text-sm text-muted-foreground">
                    1. Go to "Create Request" from the dashboard<br/>
                    2. Describe what you're looking for<br/>
                    3. Set a reward amount<br/>
                    4. Share your request link with your network
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">How to help others:</h4>
                  <p className="text-sm text-muted-foreground">
                    1. Browse requests in "My Network"<br/>
                    2. Click "Help" on requests you can assist with<br/>
                    3. Share the request with relevant contacts<br/>
                    4. Earn rewards when connections are made
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Common Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium">Is this real money?</h4>
                  <p className="text-sm text-muted-foreground">
                    No, 6Degrees is currently in beta testing. All rewards use virtual currency for testing purposes.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">How do I earn rewards?</h4>
                  <p className="text-sm text-muted-foreground">
                    You earn rewards by successfully connecting people to fulfill requests. The reward is distributed among all participants in the connection chain.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Can I delete my account?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can delete your account from your profile settings. This will remove all your data from the platform.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> august@grapherly.com</p>
                  <p><strong>Phone:</strong> +372 53687119</p>
                  <p className="text-muted-foreground">
                    We typically respond within 24 hours during business days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            {submitted ? (
              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      Thank you for your suggestion!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      We've received your feedback and will review it for future updates.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSubmitted(false)}
                      className="mt-4"
                    >
                      Submit Another Suggestion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Share Your Ideas</CardTitle>
                  <CardDescription>
                    Help us improve 6Degrees by sharing your suggestions and feedback
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="suggestion-type">Type of Suggestion</Label>
                    <Select value={suggestionType} onValueChange={setSuggestionType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select suggestion type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feature">New Feature</SelectItem>
                        <SelectItem value="improvement">Improvement</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="ui">UI/UX Enhancement</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="suggestion-title">Title</Label>
                    <Input
                      id="suggestion-title"
                      placeholder="Brief title for your suggestion"
                      value={suggestionTitle}
                      onChange={(e) => setSuggestionTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="suggestion-description">Description</Label>
                    <Textarea
                      id="suggestion-description"
                      placeholder="Describe your suggestion in detail..."
                      rows={4}
                      value={suggestionDescription}
                      onChange={(e) => setSuggestionDescription(e.target.value)}
                    />
                  </div>

                  <Button 
                    onClick={handleSubmitSuggestion}
                    disabled={!suggestionType || !suggestionTitle || !suggestionDescription || submitting}
                    className="w-full"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Suggestion
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="text-xs">New</Badge>
                    <div>
                      <h4 className="font-medium text-sm">Messaging System</h4>
                      <p className="text-xs text-muted-foreground">
                        Direct messaging between connected users is now available
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="text-xs">Updated</Badge>
                    <div>
                      <h4 className="font-medium text-sm">User Discovery</h4>
                      <p className="text-xs text-muted-foreground">
                        Improved user discovery and connection request system
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;
