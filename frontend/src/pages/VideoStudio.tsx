import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Video, Upload, Sparkles, AlertCircle, CheckCircle, User } from 'lucide-react';
import { apiGet, apiPost, API_BASE_URL } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

const VideoStudio: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const q = useQuery();

  const requestIdParam = q.get('requestId') || '';
  const targetParam = q.get('target') || '';
  const messageParam = q.get('message') || '';

  const [checkingPermission, setCheckingPermission] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  // Avatar state
  const [avatarStatus, setAvatarStatus] = useState<any>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Video generation state
  const [videoMode, setVideoMode] = useState<'generate' | 'upload'>('generate');
  const [script, setScript] = useState<string>(
    messageParam
      ? `Hi! I'm looking to connect with ${targetParam}. ${messageParam}`
      : targetParam
        ? `Hi! I'm looking to connect with ${targetParam}. Can you help me reach them?`
        : ''
  );
  const [requestId, setRequestId] = useState<string>(requestIdParam);
  const [submitting, setSubmitting] = useState(false);
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Upload states (for direct video upload)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is creator of the request and load existing video
  useEffect(() => {
    let mounted = true;
    const checkPermission = async () => {
      if (!requestIdParam || !user) {
        setCheckingPermission(false);
        return;
      }

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('connection_requests')
          .select('creator_id, video_url')
          .eq('id', requestIdParam)
          .single();

        if (!mounted) return;

        if (error || !data) {
          toast({
            title: 'Request not found',
            description: 'Could not find this request.',
            variant: 'destructive'
          });
          setCheckingPermission(false);
          return;
        }

        const userIsCreator = data.creator_id === user.id;
        setIsCreator(userIsCreator);

        // Load existing video if present
        if (data.video_url) {
          setGeneratedVideoUrl(data.video_url);
        }

        if (!userIsCreator) {
          toast({
            title: 'Access Denied',
            description: 'Only the creator can edit videos for this request.',
            variant: 'destructive'
          });
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      } catch (e) {
        console.error('Permission check error:', e);
      } finally {
        if (mounted) setCheckingPermission(false);
      }
    };

    checkPermission();
    return () => { mounted = false; };
  }, [requestIdParam, user, navigate, toast]);

  // Load avatar status
  useEffect(() => {
    let mounted = true;
    const loadAvatarStatus = async () => {
      try {
        setLoadingAvatar(true);
        const status = await apiGet('/api/users/avatar/status');
        if (!mounted) return;
        setAvatarStatus(status);
      } catch (e) {
        console.error('Error loading avatar status:', e);
      } finally {
        if (mounted) setLoadingAvatar(false);
      }
    };

    if (user) {
      loadAvatarStatus();
    }

    return () => {
      mounted = false;
    };
  }, [user]);

  // Poll status while training (separate effect to avoid stale closures)
  useEffect(() => {
    if (!avatarStatus || avatarStatus.trained) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const status = await apiGet('/api/users/avatar/status');
        setAvatarStatus(status);
      } catch (e) {
        console.error('Error polling avatar status:', e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [avatarStatus?.trained]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Image must be less than 10MB.', variant: 'destructive' });
        return;
      }
      setSelectedPhoto(file);
    }
  };

  const handleRefreshAvatar = async () => {
    try {
      const result = await apiPost('/api/users/avatar/refresh', {});
      toast({
        title: 'Avatar refreshed!',
        description: 'Preview URL updated successfully.'
      });
      // Reload avatar status
      const status = await apiGet('/api/users/avatar/status');
      setAvatarStatus(status);
    } catch (e: any) {
      toast({
        title: 'Refresh failed',
        description: e?.message || 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const handleUploadAndGenerate = async () => {
    if (!selectedPhoto) {
      toast({ title: 'No photo selected', description: 'Please select a photo first.', variant: 'destructive' });
      return;
    }

    try {
      setUploadingPhoto(true);

      // 1. Upload photo to Supabase storage (temporary - will be deleted after processing)
      const supabase = getSupabase();
      const fileName = `temp/${user?.id}-avatar-${Date.now()}.${selectedPhoto.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedPhoto, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Get public URL (temporary, will be deleted after HeyGen processing)
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      toast({ title: 'Photo uploaded', description: 'Uploading to HeyGen...' });

      // 3. Upload to HeyGen and get image key
      const uploadResult = await apiPost('/api/users/avatar/generate', {
        imageUrl: publicUrl
      });

      toast({ title: 'Avatar uploaded!', description: 'Creating and training avatar group...' });

      // 4. Create and train avatar group
      await apiPost('/api/users/avatar/train', {});

      // 5. Delete original photo from storage for privacy
      try {
        await supabase.storage
          .from('avatars')
          .remove([fileName]);
        console.log('✅ Original photo deleted from storage for privacy');
      } catch (deleteError) {
        console.error('⚠️ Failed to delete original photo:', deleteError);
        // Continue anyway - avatar is created
      }

      toast({
        title: 'Training started!',
        description: 'Your avatar is being trained. This takes 2-3 minutes. Your original photo has been securely deleted.',
        duration: 5000
      });

      // Reload avatar status
      const status = await apiGet('/api/users/avatar/status');
      setAvatarStatus(status);
      setSelectedPhoto(null);
    } catch (e: any) {
      toast({ title: 'Avatar creation failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleGenerate = async () => {
    if (!requestId) {
      toast({ title: 'Request ID required', description: 'Open this page from a request or enter the Request ID.', variant: 'destructive' });
      return;
    }
    if (!script || script.trim().length < 10) {
      toast({ title: 'Script too short', description: 'Please write at least 10 characters.', variant: 'destructive' });
      return;
    }
    if (!avatarStatus?.trained) {
      toast({ title: 'Avatar not ready', description: 'Please wait for your avatar to finish training.', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      setVideoGenerating(true);

      toast({
        title: 'Starting generation...',
        description: 'Your AI avatar is creating the video.'
      });

      const result = await apiPost(`/api/requests/${requestId}/video/generate`, {
        script: script.trim(),
        talkingPhotoId: avatarStatus.photoId
      });

      setVideoId(result.videoId);

      toast({
        title: 'Generation started!',
        description: 'Your video is being created. This typically takes 1-2 minutes.'
      });

      // Poll for video status
      pollVideoStatus(result.videoId);
    } catch (e: any) {
      toast({ title: 'Failed to start generation', description: e?.message || 'Unknown error', variant: 'destructive' });
      setSubmitting(false);
      setVideoGenerating(false);
    } finally {
      setSubmitting(false);
    }
  };

  const pollVideoStatus = async (videoId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await apiGet(`/api/requests/${requestId}/video/status/${videoId}`);

        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setVideoGenerating(false);
          setGeneratedVideoUrl(status.videoUrl);

          toast({
            title: 'Video ready!',
            description: 'Your AI video has been generated successfully.'
          });
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setVideoGenerating(false);

          toast({
            title: 'Generation failed',
            description: status.error || 'Video generation failed',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Error polling video status:', error);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast({ title: 'Invalid file', description: 'Please select a video file.', variant: 'destructive' });
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Video must be less than 50MB.', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!requestId) {
      toast({ title: 'Request ID required', description: 'Open this page from a request or enter the Request ID.', variant: 'destructive' });
      return;
    }
    if (!selectedFile) {
      toast({ title: 'No file selected', description: 'Please select a video file to upload.', variant: 'destructive' });
      return;
    }

    try {
      setUploading(true);

      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      // Upload video
      const formData = new FormData();
      formData.append('video', selectedFile);

      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/requests/${requestId}/video/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Video upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const videoUrl = uploadResult.videoUrl;

      if (!videoUrl) {
        throw new Error('No video URL returned from server');
      }

      // Auto-generate thumbnail
      let thumbnailUrl = '';
      try {
        const videoElement = document.createElement('video');
        videoElement.src = URL.createObjectURL(selectedFile);
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          videoElement.onloadedmetadata = () => resolve();
          videoElement.onerror = () => reject(new Error('Failed to load video'));
        });

        videoElement.currentTime = 0.5;
        await new Promise<void>((resolve) => {
          videoElement.onseeked = () => resolve();
        });

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        }

        const thumbnailBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
        });

        const thumbFormData = new FormData();
        thumbFormData.append('video', thumbnailBlob, `${requestId}-thumb.jpg`);

        const thumbResponse = await fetch(
          `${API_BASE_URL}/api/requests/${requestId}/thumbnail/upload`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: thumbFormData
          }
        );

        if (thumbResponse.ok) {
          const thumbResult = await thumbResponse.json();
          thumbnailUrl = thumbResult.thumbnailUrl;
        }

        URL.revokeObjectURL(videoElement.src);
      } catch (thumbError) {
        console.error('Thumbnail generation error:', thumbError);
      }

      toast({
        title: 'Success!',
        description: thumbnailUrl
          ? 'Video and thumbnail uploaded successfully!'
          : 'Video uploaded successfully'
      });
      navigate(`/request/${requestId}`);
    } catch (e: any) {
      console.error('Video upload error:', e);
      toast({ title: 'Upload failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (checkingPermission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!isCreator && requestIdParam) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            Only the creator of a request can edit videos. Redirecting to dashboard...
          </p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Video className="w-5 h-5" /> Video Studio</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Request ID" value={requestId} onChange={(e) => setRequestId(e.target.value)} className="w-64" />
        </div>
      </div>

      {/* Avatar Status Card */}
      <Card className="p-6 mb-6 max-w-7xl mx-auto">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" /> Your AI Avatar
        </h2>

        {loadingAvatar ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading avatar status...
          </div>
        ) : !avatarStatus?.hasAvatar ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              You need to create your personal AI avatar first. Upload a photo and we'll convert it to a cartoon-style talking avatar.
            </p>

            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <div
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition"
              >
                {selectedPhoto ? (
                  <div>
                    <User className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <p className="font-medium mb-1">{selectedPhoto.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedPhoto.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={(e) => { e.stopPropagation(); setSelectedPhoto(null); }}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-1">Click to upload your photo</p>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG, WEBP (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {selectedPhoto && (
              <Button onClick={handleUploadAndGenerate} disabled={uploadingPhoto} size="lg" className="w-full">
                {uploadingPhoto ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Create My AI Avatar
              </Button>
            )}
          </div>
        ) : !avatarStatus.trained ? (
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Avatar Training in Progress</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your AI avatar is being trained. This usually takes 2-3 minutes. You can come back later or wait here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {avatarStatus.previewUrl ? (
                <img src={avatarStatus.previewUrl} alt="Your avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-semibold">Avatar Ready!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your personal AI avatar is trained and ready to generate videos.
              </p>
              <Button variant="outline" size="sm" onClick={handleRefreshAvatar} className="mt-2">
                Refresh Avatar Preview
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Video Generation Card */}
      <Card className="p-6 max-w-7xl mx-auto">
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

        {videoMode === 'generate' && (
          <div className="space-y-6">
            {videoGenerating && (
              <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Generating Video...</p>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your AI avatar is creating the video. This typically takes 1-2 minutes. Please wait...
                </p>
              </div>
            )}

            {generatedVideoUrl && (
              <div className="space-y-3">
                <Label>Generated Video</Label>
                <div className="rounded-lg overflow-hidden bg-black">
                  <video
                    src={generatedVideoUrl}
                    controls
                    className="w-full"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.open(generatedVideoUrl, '_blank')}>
                    Open in New Tab
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setGeneratedVideoUrl(null);
                    setScript('');
                  }}>
                    Generate New Video
                  </Button>
                </div>
              </div>
            )}

            {!generatedVideoUrl && !videoGenerating && (
              <>
                <div>
                  <Label htmlFor="script">Script</Label>
                  <Textarea
                    id="script"
                    rows={6}
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="What will your avatar say in the video?"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your personal avatar will deliver this message in the video.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    onClick={handleGenerate}
                    disabled={submitting || !requestId || !script || script.trim().length < 10 || !avatarStatus?.trained}
                    size="lg"
                    className="min-w-40"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                    Generate Video
                  </Button>
                  <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                </div>
              </>
            )}
          </div>
        )}

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
