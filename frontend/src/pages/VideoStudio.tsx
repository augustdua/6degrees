import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Video, SlidersHorizontal, Search, Upload, Sparkles } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type Avatar = {
  avatar_id: string;
  avatar_name?: string;
  gender?: string;
  language?: string;
  preview_image_url?: string;
  style?: string;
  tags?: string[];
  premium?: boolean;
  is_public?: boolean;
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

  const [videoMode, setVideoMode] = useState<'generate' | 'upload'>('generate');
  const [avatarSearch, setAvatarSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [ethnicityFilter, setEthnicityFilter] = useState<string>('all');
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

  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Extract unique tags for filtering
  const { ageGroups, ethnicities } = useMemo(() => {
    const ages = new Set<string>();
    const ethn = new Set<string>();

    avatars.forEach(a => {
      if (a.tags && Array.isArray(a.tags)) {
        a.tags.forEach(tag => {
          const lowerTag = tag.toLowerCase();
          // Age detection
          if (lowerTag.includes('young') || lowerTag.includes('kid') || lowerTag.includes('child') || lowerTag.includes('teen')) {
            ages.add('Young');
          } else if (lowerTag.includes('middle') || lowerTag.includes('adult')) {
            ages.add('Middle-aged');
          } else if (lowerTag.includes('old') || lowerTag.includes('senior') || lowerTag.includes('elder')) {
            ages.add('Senior');
          }

          // Ethnicity detection
          if (lowerTag.includes('asian') || lowerTag.includes('east asian') || lowerTag.includes('chinese') || lowerTag.includes('japanese') || lowerTag.includes('korean')) {
            ethn.add('Asian');
          } else if (lowerTag.includes('caucasian') || lowerTag.includes('white') || lowerTag.includes('european')) {
            ethn.add('Caucasian');
          } else if (lowerTag.includes('african') || lowerTag.includes('black')) {
            ethn.add('African');
          } else if (lowerTag.includes('hispanic') || lowerTag.includes('latino') || lowerTag.includes('latina')) {
            ethn.add('Hispanic');
          } else if (lowerTag.includes('middle eastern') || lowerTag.includes('arab')) {
            ethn.add('Middle Eastern');
          } else if (lowerTag.includes('indian') || lowerTag.includes('south asian')) {
            ethn.add('South Asian');
          }
        });
      }
    });

    return {
      ageGroups: Array.from(ages).sort(),
      ethnicities: Array.from(ethn).sort()
    };
  }, [avatars]);

  const filteredAvatars = useMemo(() => {
    const q = avatarSearch.trim().toLowerCase();
    return avatars.filter(a => {
      // Text search filter
      if (q) {
        const text = [a.avatar_name, a.avatar_id, a.gender, a.style, a.language, ...(a.tags || [])].filter(Boolean).join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      // Gender filter
      if (genderFilter !== 'all' && a.gender !== genderFilter) return false;
      // Style filter
      if (styleFilter !== 'all') {
        if (styleFilter === 'Animated' && a.style !== 'Animated') return false;
        if (styleFilter === 'Standard' && a.style === 'Animated') return false;
      }
      // Age filter
      if (ageFilter !== 'all' && a.tags && Array.isArray(a.tags)) {
        const tagStr = a.tags.join(' ').toLowerCase();
        if (ageFilter === 'Young' && !(tagStr.includes('young') || tagStr.includes('kid') || tagStr.includes('child') || tagStr.includes('teen'))) return false;
        if (ageFilter === 'Middle-aged' && !(tagStr.includes('middle') || tagStr.includes('adult'))) return false;
        if (ageFilter === 'Senior' && !(tagStr.includes('old') || tagStr.includes('senior') || tagStr.includes('elder'))) return false;
      }
      // Ethnicity filter
      if (ethnicityFilter !== 'all' && a.tags && Array.isArray(a.tags)) {
        const tagStr = a.tags.join(' ').toLowerCase();
        if (ethnicityFilter === 'Asian' && !tagStr.match(/asian|east asian|chinese|japanese|korean/)) return false;
        if (ethnicityFilter === 'Caucasian' && !tagStr.match(/caucasian|white|european/)) return false;
        if (ethnicityFilter === 'African' && !tagStr.match(/african|black/)) return false;
        if (ethnicityFilter === 'Hispanic' && !tagStr.match(/hispanic|latino|latina/)) return false;
        if (ethnicityFilter === 'Middle Eastern' && !tagStr.match(/middle eastern|arab/)) return false;
        if (ethnicityFilter === 'South Asian' && !tagStr.match(/indian|south asian/)) return false;
      }
      return true;
    });
  }, [avatars, avatarSearch, genderFilter, styleFilter, ageFilter, ethnicityFilter]);


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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast({ title: 'Invalid file', description: 'Please select a video file.', variant: 'destructive' });
        return;
      }
      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Video must be less than 50MB.', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!requestId) {
      toast({ title: 'Request ID required', description: 'Open this page from a request or paste the Request ID.', variant: 'destructive' });
      return;
    }
    if (!selectedFile) {
      toast({ title: 'No file selected', description: 'Please select a video file to upload.', variant: 'destructive' });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('video', selectedFile);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requests/${requestId}/video/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      toast({ title: 'Success!', description: 'Video uploaded successfully!' });
      navigate(`/request/${requestId}`);
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setUploading(false);
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
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setVideoMode('generate')}
            className={`px-4 py-2 font-medium border-b-2 transition ${videoMode === 'generate' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            Generate AI Video
          </button>
          <button
            onClick={() => setVideoMode('upload')}
            className={`px-4 py-2 font-medium border-b-2 transition ${videoMode === 'upload' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload Video
          </button>
        </div>

        {/* Generate Mode */}
        {videoMode === 'generate' && (
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

                {/* Avatar Filters */}
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground self-center mr-1">Gender:</span>
                    <Button
                      variant={genderFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGenderFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={genderFilter === 'female' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGenderFilter('female')}
                    >
                      Female
                    </Button>
                    <Button
                      variant={genderFilter === 'male' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGenderFilter('male')}
                    >
                      Male
                    </Button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground self-center mr-1">Style:</span>
                    <Button
                      variant={styleFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStyleFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={styleFilter === 'Standard' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStyleFilter('Standard')}
                    >
                      Standard
                    </Button>
                    <Button
                      variant={styleFilter === 'Animated' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStyleFilter('Animated')}
                    >
                      Animated
                    </Button>
                  </div>

                  {ageGroups.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground self-center mr-1">Age:</span>
                      <Button
                        variant={ageFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAgeFilter('all')}
                      >
                        All
                      </Button>
                      {ageGroups.map(age => (
                        <Button
                          key={age}
                          variant={ageFilter === age ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAgeFilter(age)}
                        >
                          {age}
                        </Button>
                      ))}
                    </div>
                  )}

                  {ethnicities.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground self-center mr-1">Ethnicity:</span>
                      <Button
                        variant={ethnicityFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEthnicityFilter('all')}
                      >
                        All
                      </Button>
                      {ethnicities.map(eth => (
                        <Button
                          key={eth}
                          variant={ethnicityFilter === eth ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEthnicityFilter(eth)}
                        >
                          {eth}
                        </Button>
                      ))}
                    </div>
                  )}
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
                <div className="space-y-3 max-h-[680px] overflow-auto pr-1">
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
        )}

        {/* Upload Mode */}
        {videoMode === 'upload' && (
          <div className="space-y-6">
            <div>
              <Label>Upload Your Video</Label>
              <div className="mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition"
                >
                  {selectedFile ? (
                    <div>
                      <Video className="w-12 h-12 mx-auto mb-4 text-primary" />
                      <p className="font-medium mb-1">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-medium mb-1">Click to upload video</p>
                      <p className="text-sm text-muted-foreground">
                        MP4, MOV, AVI, WEBM (max 50MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleUpload} disabled={uploading || !requestId || !selectedFile} size="lg" className="min-w-40">
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Video
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VideoStudio;


