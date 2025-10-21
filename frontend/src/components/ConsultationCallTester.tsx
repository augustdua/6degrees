import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiPost, API_ENDPOINTS } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, X, Target } from 'lucide-react';
import { DailyCallProvider } from './DailyCallProvider';
import { AICoilotCallUI } from './AICoilotCallUI';

interface ConsultationConfig {
  userName: string;
  userRole: 'user' | 'broker' | 'consultant';
  consultantName: string;
  consultantRole: 'user' | 'broker' | 'consultant';
  brokerName: string;
  callTopic: string;
  question1: string;
  question2: string;
  question3: string;
}

export const ConsultationCallTester = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [callToken, setCallToken] = useState<string | null>(null);
  
  const [config, setConfig] = useState<ConsultationConfig>({
    userName: '',
    userRole: 'user',
    consultantName: '',
    consultantRole: 'consultant',
    brokerName: '',
    callTopic: '',
    question1: '',
    question2: '',
    question3: ''
  });

  const handleInputChange = (field: keyof ConsultationConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleStartCall = async () => {
    console.log('=== START CALL HANDLER INITIATED ===');
    console.log('Current config:', config);

    // Validation
    if (!config.userName.trim()) {
      console.log('❌ Validation failed: userName is empty');
      toast({
        title: 'Missing Information',
        description: 'Please enter your name',
        variant: 'destructive'
      });
      return;
    }

    if (!config.consultantName.trim()) {
      console.log('❌ Validation failed: consultantName is empty');
      toast({
        title: 'Missing Information',
        description: 'Please enter consultant name',
        variant: 'destructive'
      });
      return;
    }

    if (!config.callTopic.trim()) {
      console.log('❌ Validation failed: callTopic is empty');
      toast({
        title: 'Missing Information',
        description: 'Please enter call topic',
        variant: 'destructive'
      });
      return;
    }

    console.log('✅ Validation passed');
    setLoading(true);

    try {
      const questions = [
        config.question1,
        config.question2,
        config.question3
      ].filter(q => q.trim() !== '');

      console.log('📤 Sending API request to:', API_ENDPOINTS.CONSULTATION_START);
      console.log('Request payload:', {
        userName: config.userName,
        userRole: config.userRole,
        consultantName: config.consultantName,
        consultantRole: config.consultantRole,
        brokerName: config.brokerName || undefined,
        callTopic: config.callTopic,
        questions
      });

      const response = await apiPost(API_ENDPOINTS.CONSULTATION_START, {
        userName: config.userName,
        userRole: config.userRole,
        consultantName: config.consultantName,
        consultantRole: config.consultantRole,
        brokerName: config.brokerName || undefined,
        callTopic: config.callTopic,
        questions
      });

      console.log('📥 Received API response:', response);
      console.log('Response type:', typeof response);
      console.log('Response.success:', response?.success);
      console.log('Response.roomUrl:', response?.roomUrl);
      console.log('Response.tokens:', response?.tokens);
      console.log('Response.tokens.user:', response?.tokens?.user);
      console.log('Response.error:', response?.error);

      if (response && response.success && response.roomUrl && response.tokens && response.tokens.user) {
        console.log('✅ Response validation passed, setting state');
        setRoomUrl(response.roomUrl);
        setCallToken(response.tokens.user);

        toast({
          title: 'Call Started!',
          description: 'Joining the consultation call with AI co-pilot...'
        });
      } else {
        console.log('❌ Response validation failed');
        console.log('Missing or invalid properties:', {
          hasResponse: !!response,
          hasSuccess: response?.success,
          hasRoomUrl: !!response?.roomUrl,
          hasTokens: !!response?.tokens,
          hasUserToken: !!response?.tokens?.user
        });
        throw new Error(response?.error || 'Failed to start call - invalid response structure');
      }
    } catch (error: any) {
      console.error('❌ ERROR CAUGHT in handleStartCall:');
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);

      // Check if it's a 401 Unauthorized error
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        toast({
          title: 'Sign In Required',
          description: 'Please sign in to start a consultation call',
          variant: 'destructive',
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                window.location.href = '/auth?returnUrl=' + encodeURIComponent(window.location.pathname);
              }}
            >
              Sign In
            </Button>
          )
        });
      } else {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to start consultation call',
          variant: 'destructive'
        });
      }
    } finally {
      console.log('=== CLEANUP: Setting loading to false ===');
      setLoading(false);
    }
  };

  const handleEndCall = () => {
    setRoomUrl(null);
    setCallToken(null);
    toast({
      title: 'Call Ended',
      description: 'You have left the consultation call'
    });
  };

  if (roomUrl && callToken) {
    return (
      <Card className="border-primary/20 shadow-network">
        <CardHeader className="bg-gradient-network text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Phone className="w-6 h-6" />
                Live Consultation Call
              </CardTitle>
              <CardDescription className="text-primary-foreground/90">
                AI Co-Pilot is active in this call
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              onClick={handleEndCall}
              className="shadow-lg hover:shadow-xl transition-smooth"
            >
              <X className="w-4 h-4 mr-2" />
              End Call
            </Button>
          </div>
        </CardHeader>
        <CardContent className="mt-6">
          <DailyCallProvider
            roomUrl={roomUrl}
            token={callToken}
            userName={config.userName}
          >
            <AICoilotCallUI />
          </DailyCallProvider>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-2 border-primary/20 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                  🎙️
                </div>
                AI Co-Pilot Controls
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span><strong className="text-foreground">Press and hold</strong> the microphone button to ask the AI a question</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>The bot will <strong className="text-foreground">raise its hand</strong> when it wants to speak</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Click <strong className="text-foreground">"Approve"</strong> to let the bot respond</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Bot states: <strong className="text-foreground">Listening → Thinking → Speaking</strong></span>
                </li>
              </ul>
            </div>
            <div className="p-4 bg-gradient-to-br from-success/5 to-transparent border-2 border-success/20 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-success flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-success text-success-foreground flex items-center justify-center text-xs">
                  🤖
                </div>
                Bot Monitors For
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-success font-bold">•</span>
                  <span>Questions answered <strong className="text-foreground">vaguely or dodged</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-bold">•</span>
                  <span>Technical <strong className="text-foreground">jargon needing explanation</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-bold">•</span>
                  <span>When someone <strong className="text-foreground">joins late</strong> (provides context)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-bold">•</span>
                  <span>When you <strong className="text-foreground">directly address the AI</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-network">
      <CardHeader className="bg-gradient-network text-primary-foreground">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Phone className="w-6 h-6" />
          AI Co-Pilot Test Console
        </CardTitle>
        <CardDescription className="text-primary-foreground/90">
          Configure and start a consultation call with AI moderation (for testing)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 mt-6">
        {/* Participant 1 */}
        <div className="space-y-4 p-5 border-2 border-primary/20 rounded-lg bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40 transition-smooth">
          <h3 className="font-semibold text-base text-primary flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
            Participant 1 (You)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="userName">Your Name</Label>
              <Input
                id="userName"
                placeholder="Your full name"
                value={config.userName}
                onChange={(e) => handleInputChange('userName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="userRole">Your Role</Label>
              <Select
                value={config.userRole}
                onValueChange={(value) => handleInputChange('userRole', value)}
              >
                <SelectTrigger id="userRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Seeking Connection)</SelectItem>
                  <SelectItem value="broker">Broker (Facilitating)</SelectItem>
                  <SelectItem value="consultant">Consultant (Expert)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Participant 2 */}
        <div className="space-y-4 p-5 border-2 border-primary/20 rounded-lg bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40 transition-smooth">
          <h3 className="font-semibold text-base text-primary flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
            Participant 2
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="consultantName">Name</Label>
              <Input
                id="consultantName"
                placeholder="Participant name"
                value={config.consultantName}
                onChange={(e) => handleInputChange('consultantName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="consultantRole">Role</Label>
              <Select
                value={config.consultantRole}
                onValueChange={(value) => handleInputChange('consultantRole', value)}
              >
                <SelectTrigger id="consultantRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultant">Consultant (Expert)</SelectItem>
                  <SelectItem value="user">User (Seeking Connection)</SelectItem>
                  <SelectItem value="broker">Broker (Facilitating)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Optional Broker */}
        <div className="space-y-4 p-5 border-2 border-primary/20 rounded-lg bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40 transition-smooth">
          <h3 className="font-semibold text-base text-primary flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">3</div>
            Participant 3 (Optional Broker)
          </h3>
          <div>
            <Label htmlFor="brokerName">Broker Name (Optional)</Label>
            <Input
              id="brokerName"
              placeholder="Broker name"
              value={config.brokerName}
              onChange={(e) => handleInputChange('brokerName', e.target.value)}
            />
          </div>
        </div>

        {/* Call Details */}
        <div className="space-y-4 p-5 border-2 border-success/20 rounded-lg bg-gradient-to-br from-success/5 to-transparent">
          <h3 className="font-semibold text-base text-success flex items-center gap-2 mb-4">
            <Target className="w-5 h-5" />
            Call Configuration
          </h3>

          <div>
            <Label htmlFor="callTopic" className="text-foreground font-medium">Call Topic</Label>
            <Input
              id="callTopic"
              placeholder="Enter the consultation topic"
              value={config.callTopic}
              onChange={(e) => handleInputChange('callTopic', e.target.value)}
              className="mt-1.5 border-input focus:border-primary focus:ring-primary"
            />
          </div>

          <div>
            <Label htmlFor="question1" className="text-foreground font-medium">Question 1</Label>
            <Textarea
              id="question1"
              placeholder="First question you want to ask"
              value={config.question1}
              onChange={(e) => handleInputChange('question1', e.target.value)}
              rows={2}
              className="mt-1.5 border-input focus:border-primary focus:ring-primary"
            />
          </div>

          <div>
            <Label htmlFor="question2" className="text-muted-foreground font-medium">Question 2 (Optional)</Label>
            <Textarea
              id="question2"
              placeholder="Second question"
              value={config.question2}
              onChange={(e) => handleInputChange('question2', e.target.value)}
              rows={2}
              className="mt-1.5 border-input focus:border-primary focus:ring-primary"
            />
          </div>

          <div>
            <Label htmlFor="question3" className="text-muted-foreground font-medium">Question 3 (Optional)</Label>
            <Textarea
              id="question3"
              placeholder="Third question"
              value={config.question3}
              onChange={(e) => handleInputChange('question3', e.target.value)}
              rows={2}
              className="mt-1.5 border-input focus:border-primary focus:ring-primary"
            />
          </div>
        </div>

        <Button
          onClick={handleStartCall}
          disabled={loading}
          className="w-full bg-gradient-network hover:shadow-network transition-smooth text-lg font-semibold"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Starting Call...
            </>
          ) : (
            <>
              <Phone className="w-5 h-5 mr-2" />
              Start AI Co-Pilot Call
            </>
          )}
        </Button>

        <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-primary font-bold">ℹ️</span>
            </div>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Note:</strong> This is a testing interface. No data will be saved to the database.
            </p>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs">🤖</span>
            </div>
            <p className="text-muted-foreground">
              The AI co-pilot will <strong className="text-foreground">monitor</strong> the call and <strong className="text-foreground">speak up</strong> when needed.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

