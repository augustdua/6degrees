import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Video, SlidersHorizontal, Search } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type Avatar = {
  avatar_id: string;
  avatar_name?: string;
  gender?: string;
  language?: string;
  preview_image_url?: string;
  style?: string;
};

type Voice = {
  voice_id: string;
  voice_name?: string;
  language?: string;
  gender?: string;
  country?: string;
  locale?: string;
  preview_url?: string;
};

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const VideoStudio: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const q = useQuery();

  const requestIdParam = q.get('requestId') || '';
  const targetParam = q.get('target') || '';
  const messageParam = q.get('message') || '';

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);

  const [avatarSearch, setAvatarSearch] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('Daisy-inskirt-20220818');
  const [selectedVoice, setSelectedVoice] = useState<string>('2d5b0e6cf36f460aa7fc47e3eee4ba54');

  const [script, setScript] = useState<string>(
    messageParam
      ? `Hi! I'm looking to connect with ${targetParam}. ${messageParam}`
      : targetParam
        ? `Hi! I'm looking to connect with ${targetParam}. Can you help me reach them?`
        : ''
  );
  const [requestId, setRequestId] = useState<string>(requestIdParam);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingOptions(true);
        const [a, v] = await Promise.all([
          apiGet('/api/requests/heygen/avatars'),
          apiGet('/api/requests/heygen/voices')
        ]);
        if (!mounted) return;
        setAvatars(a.avatars || []);
        setVoices(v.voices || []);
      } catch (e) {
        toast({ title: 'Failed to load options', description: 'Could not load avatars/voices', variant: 'destructive' });
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [toast]);

  const filteredAvatars = useMemo(() => {
    const q = avatarSearch.trim().toLowerCase();
    if (!q) return avatars;
    return avatars.filter(a => {
      const text = [a.avatar_name, a.avatar_id, a.gender, a.style, a.language].filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });
  }, [avatars, avatarSearch]);


  const handleGenerate = async () => {
    if (!requestId) {
      toast({ title: 'Request ID required', description: 'Open this page from a request or paste the Request ID.', variant: 'destructive' });
      return;
    }
    if (!script || script.trim().length < 10) {
      toast({ title: 'Script too short', description: 'Please write at least 10 characters.', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      await apiPost(`/api/requests/${requestId}/video/generate`, {
        script: script.trim(),
        avatarId: selectedAvatar,
        voiceId: selectedVoice
      });
      toast({ title: 'Started!', description: 'Video generation has started. You can track status from the request page.' });
      navigate(`/request/${requestId}`);
    } catch (e: any) {
      toast({ title: 'Failed to start generation', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><SlidersHorizontal className="w-5 h-5" /> Video Studio</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Request ID" value={requestId} onChange={(e) => setRequestId(e.target.value)} className="w-64" />
        </div>
      </div>

      <Card className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div>
            <Label htmlFor="script">Script</Label>
            <Textarea id="script" rows={6} value={script} onChange={(e) => setScript(e.target.value)} placeholder="What will the avatar say?" className="mt-2" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Choose Avatar</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input placeholder="Search avatars..." value={avatarSearch} onChange={(e) => setAvatarSearch(e.target.value)} className="pl-8 h-9 w-56" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[580px] overflow-auto pr-1">
                {loadingOptions ? (
                  <div className="col-span-full flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading avatars...</div>
                ) : (
                  filteredAvatars.map(a => (
                    <button key={a.avatar_id} type="button" onClick={() => setSelectedAvatar(a.avatar_id)}
                      className={`p-3 border-2 rounded-lg text-left hover:border-primary transition ${selectedAvatar === a.avatar_id ? 'border-primary ring-2 ring-primary bg-primary/5' : 'border-border'}`}>
                      <div className="aspect-[3/4] bg-muted rounded-md mb-2 overflow-hidden">
                        {a.preview_image_url ? (
                          <img src={a.preview_image_url} alt={a.avatar_name || a.avatar_id} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No preview</div>
                        )}
                      </div>
                      <div className="text-sm font-medium truncate">{a.avatar_name || 'Avatar'}</div>
                      {(a.style || a.gender) && (
                        <div className="text-xs text-muted-foreground truncate">{[a.style, a.gender].filter(Boolean).join(' • ')}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Choose Voice</Label>
              </div>
              <div className="space-y-3 max-h-[580px] overflow-auto pr-1">
                {loadingOptions ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading voices...</div>
                ) : (
                  voices.map(v => (
                    <button key={v.voice_id} type="button" onClick={() => setSelectedVoice(v.voice_id)}
                      className={`w-full p-4 border-2 rounded-lg text-left hover:border-primary transition ${selectedVoice === v.voice_id ? 'border-primary ring-2 ring-primary bg-primary/5' : 'border-border'}`}>
                      <div className="text-sm font-medium mb-1">{v.voice_name || 'Voice'}</div>
                      {(v.language || v.gender || v.country) && (
                        <div className="text-xs text-muted-foreground mb-2">{[v.language, v.country, v.gender].filter(Boolean).join(' • ')}</div>
                      )}
                      {v.preview_url && (
                        <audio src={v.preview_url} controls className="w-full h-8" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={handleGenerate} disabled={submitting || !requestId || !script || script.trim().length < 10} size="lg" className="min-w-40">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
              Generate Video
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VideoStudio;


