import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Video, CheckCircle2, Sparkles } from 'lucide-react';
import { apiPost, apiGet } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AIVideoGeneratorProps {
  requestId: string;
  target: string;
  message: string;
  onVideoReady?: (videoUrl: string) => void;
}

export function AIVideoGenerator({
  requestId,
  target,
  message,
  onVideoReady
}: AIVideoGeneratorProps) {
  const [step, setStep] = useState<'script' | 'generating' | 'polling' | 'complete'>('script');
  const [script, setScript] = useState(
    message
      ? `Hi! I'm looking to connect with ${target}. ${message}`
      : `Hi! I'm looking to connect with ${target}. Can you help me reach them?`
  );
  const [selectedAvatar, setSelectedAvatar] = useState('Daisy-inskirt-20220818');
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!script || script.trim().length < 10) {
      toast({
        title: 'Script Required',
        description: 'Please write a script (at least 10 characters)',
        variant: 'destructive'
      });
      return;
    }

    try {
      setStep('generating');
      setGenerating(true);
      setError(null);

      console.log('Starting video generation for request:', requestId);

      // Start video generation
      const response = await apiPost(`/api/requests/${requestId}/video/generate`, {
        script: script.trim(),
        avatarId: selectedAvatar,
        voiceId: '2d5b0e6cf36f460aa7fc47e3eee4ba54' // Default voice
      });

      console.log('Video generation started:', response);

      toast({
        title: 'Video Generating',
        description: 'Your AI video is being created. This may take 1-2 minutes.',
      });

      // Start polling for status
      setGenerating(false);
      setStep('polling');
      setPolling(true);
      pollVideoStatus();
    } catch (err: any) {
      console.error('Error generating video:', err);
      setError(err.message || 'Failed to generate video');
      setGenerating(false);
      setStep('script');
      toast({
        title: 'Generation Failed',
        description: err.message || 'Failed to start video generation',
        variant: 'destructive'
      });
    }
  };

  const pollVideoStatus = async () => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 5 minutes (every 5 seconds)

    const poll = async () => {
      try {
        const status = await apiGet(`/api/requests/${requestId}/video/status`);
        console.log('Video status:', status);

        if (status.status === 'completed' && status.videoUrl) {
          setVideoUrl(status.videoUrl);
          setPolling(false);
          setStep('complete');
          onVideoReady?.(status.videoUrl);
          toast({
            title: 'Video Ready!',
            description: 'Your AI video has been generated successfully.',
          });
        } else if (status.status === 'failed') {
          setError(status.error || 'Video generation failed');
          setPolling(false);
          setStep('script');
          toast({
            title: 'Generation Failed',
            description: status.error || 'Video generation failed',
            variant: 'destructive'
          });
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setError('Video generation timed out');
            setPolling(false);
            setStep('script');
          }
        }
      } catch (err: any) {
        console.error('Error polling video status:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError('Failed to check video status');
          setPolling(false);
        }
      }
    };

    poll();
  };

  // Step 1: Script Editor & Avatar Selector
  if (step === 'script') {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold">Create Your AI Video</h3>
          </div>

          <div>
            <Label htmlFor="script">Video Script</Label>
            <Textarea
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="What will your AI avatar say in the video?"
              rows={4}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This is what the AI avatar will say in your video
            </p>
          </div>

          <div>
            <Label>Choose Avatar</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => setSelectedAvatar('Daisy-inskirt-20220818')}
                className={`p-4 border-2 rounded-lg transition ${
                  selectedAvatar === 'Daisy-inskirt-20220818'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="font-semibold">Daisy</div>
                <div className="text-xs text-muted-foreground">Female</div>
              </button>
              {/* Add more avatars here when available */}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            className="w-full"
            size="lg"
            disabled={!script || script.trim().length < 10}
          >
            <Video className="w-5 h-5 mr-2" />
            Generate AI Video
          </Button>
        </div>
      </Card>
    );
  }

  // Step 2 & 3: Generating / Polling
  if (step === 'generating' || step === 'polling') {
    return (
      <Card className="p-8 bg-blue-50 border-blue-200">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Video className="w-16 h-16 text-blue-600" />
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin absolute -top-1 -right-1" />
            </div>
          </div>
          <h3 className="font-bold text-blue-900 mb-2">
            {step === 'generating' ? 'Starting Generation...' : 'Generating Your AI Video'}
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            This usually takes 1-2 minutes. Please wait...
          </p>
          <div className="max-w-md mx-auto text-left bg-white p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-2"><strong>Your video will say:</strong></p>
            <p className="text-sm italic text-gray-700">"{script}"</p>
          </div>
        </div>
      </Card>
    );
  }

  // Step 4: Complete
  if (step === 'complete' && videoUrl) {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">Video Generated!</h3>
            <p className="text-sm text-green-700">Your AI video is ready to share</p>
          </div>
        </div>
        <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden max-w-xs mx-auto">
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-cover"
            playsInline
          />
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="text-center">
          <p className="text-red-900 font-semibold mb-2">Generation Failed</p>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <Button onClick={() => setStep('script')} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
