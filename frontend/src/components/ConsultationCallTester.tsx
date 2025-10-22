import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiPost, API_ENDPOINTS } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, X } from 'lucide-react';
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
    // Validation
    if (!config.userName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your name',
        variant: 'destructive'
      });
      return;
    }

    if (!config.consultantName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter consultant name',
        variant: 'destructive'
      });
      return;
    }

    if (!config.callTopic.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter call topic',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const questions = [
        config.question1,
        config.question2,
        config.question3
      ].filter(q => q.trim() !== '');

      const response = await apiPost(API_ENDPOINTS.CONSULTATION_START, {
        userName: config.userName,
        userRole: config.userRole,
        consultantName: config.consultantName,
        consultantRole: config.consultantRole,
        brokerName: config.brokerName || undefined,
        callTopic: config.callTopic,
        questions
      });

      if (response.success) {
        setRoomUrl(response.roomUrl);
        setCallToken(response.tokens.user);
        
        toast({
          title: 'Call Started!',
          description: 'Joining the consultation call with AI co-pilot...'
        });
      } else {
        throw new Error(response.error || 'Failed to start call');
      }
    } catch (error: any) {
      console.error('Error starting consultation call:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start consultation call',
        variant: 'destructive'
      });
    } finally {
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Live Consultation Call
              </CardTitle>
              <CardDescription>
                AI Co-Pilot is active in this call
              </CardDescription>
            </div>
            <Button variant="destructive" onClick={handleEndCall}>
              <X className="w-4 h-4 mr-2" />
              End Call
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DailyCallProvider roomUrl={roomUrl} token={callToken} userName={config.userName}>
            <AICoilotCallUI />
          </DailyCallProvider>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>🎙️ AI Co-Pilot Active:</strong> The bot will listen to the conversation and speak up when:
            </p>
            <ul className="text-sm text-blue-800 mt-2 ml-4 list-disc space-y-1">
              <li>Questions are answered vaguely or dodged</li>
              <li>Technical jargon needs explanation</li>
              <li>Someone joins the call late (provides context)</li>
              <li>You directly address the AI</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎙️ AI Co-Pilot Test Console
        </CardTitle>
        <CardDescription>
          Configure and start a consultation call with AI moderation (for testing)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Participant 1 */}
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold text-sm">Participant 1 (You)</h3>
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
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold text-sm">Participant 2</h3>
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
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold text-sm">Participant 3 (Optional Broker)</h3>
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
        <div className="space-y-4">
          <div>
            <Label htmlFor="callTopic">Call Topic</Label>
            <Input
              id="callTopic"
              placeholder="Enter the consultation topic"
              value={config.callTopic}
              onChange={(e) => handleInputChange('callTopic', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="question1">Question 1</Label>
            <Textarea
              id="question1"
              placeholder="First question you want to ask"
              value={config.question1}
              onChange={(e) => handleInputChange('question1', e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="question2">Question 2 (Optional)</Label>
            <Textarea
              id="question2"
              placeholder="Second question"
              value={config.question2}
              onChange={(e) => handleInputChange('question2', e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="question3">Question 3 (Optional)</Label>
            <Textarea
              id="question3"
              placeholder="Third question"
              value={config.question3}
              onChange={(e) => handleInputChange('question3', e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <Button
          onClick={handleStartCall}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting Call...
            </>
          ) : (
            <>
              <Phone className="w-4 h-4 mr-2" />
              Start AI Co-Pilot Call
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <p>ℹ️ <strong>Note:</strong> This is a testing interface. No data will be saved to the database.</p>
          <p>🤖 The AI co-pilot will moderate the call and speak up when needed.</p>
        </div>
      </CardContent>
    </Card>
  );
};

