import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, Image, Loader2, CheckCircle2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface VideoUploaderProps {
  requestId: string;
  onUploadComplete?: (videoUrl: string, thumbnailUrl: string) => void;
}

export function VideoUploader({ requestId, onUploadComplete }: VideoUploaderProps) {
  const { user } = useAuth();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Video must be under 50MB',
          variant: 'destructive'
        });
        return;
      }
      setVideoFile(file);
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Thumbnail must be under 5MB',
          variant: 'destructive'
        });
        return;
      }
      setThumbnailFile(file);
    }
  };

  // Generate thumbnail from video first frame
  const generateThumbnail = async (videoFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Seek to 0.5 seconds to get a better frame
        video.currentTime = 0.5;
      };

      video.onseeked = () => {
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Convert to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
            URL.revokeObjectURL(video.src);
          },
          'image/jpeg',
          0.85
        );
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast({
        title: 'No Video Selected',
        description: 'Please select a video to upload',
        variant: 'destructive'
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Not Authenticated',
        description: 'You must be logged in to upload videos',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploading(true);
      const supabase = getSupabase();
      const bucketName = '6DegreeRequests';
      
      // Upload video with user-specific folder
      const videoExt = videoFile.name.split('.').pop();
      const videoFileName = `request-videos/${user.id}/${requestId}-${Date.now()}.${videoExt}`;
      
      const { data: videoData, error: videoError } = await supabase.storage
        .from(bucketName)
        .upload(videoFileName, videoFile, {
          contentType: videoFile.type,
          upsert: false
        });

      if (videoError) throw videoError;

      const { data: videoUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(videoFileName);

      const videoUrl = videoUrlData.publicUrl;
      let thumbnailUrl: string | undefined = undefined;

      // Auto-generate thumbnail from video
      try {
        const thumbnailBlob = await generateThumbnail(videoFile);
        const thumbFileName = `thumbnails/${user.id}/${requestId}-${Date.now()}.jpg`;
        
        const { error: thumbError } = await supabase.storage
          .from(bucketName)
          .upload(thumbFileName, thumbnailBlob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
          console.log('✅ Auto-generated thumbnail:', thumbnailUrl);
        }
      } catch (thumbGenError) {
        console.warn('⚠️ Thumbnail generation failed:', thumbGenError);
      }

      // Manual thumbnail (if provided) overrides auto-generated
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split('.').pop();
        const thumbFileName = `thumbnails/${user.id}/${requestId}-${Date.now()}.${thumbExt}`;
        
        const { error: thumbError } = await supabase.storage
          .from(bucketName)
          .upload(thumbFileName, thumbnailFile, {
            contentType: thumbnailFile.type,
            upsert: false
          });

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(thumbFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
          console.log('✅ Manual thumbnail:', thumbnailUrl);
        }
      }

      // Update request via API
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || ''}/api/requests/${requestId}/video/direct-upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ videoUrl, thumbnailUrl })
        }
      );

      if (!response.ok) throw new Error('Failed to update request');

      setUploadComplete(true);
      onUploadComplete?.(videoUrl, thumbnailUrl || '');
      
      toast({
        title: 'Upload Successful',
        description: thumbnailUrl 
          ? 'Video and thumbnail uploaded successfully' 
          : 'Video uploaded (thumbnail auto-generated)',
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload Failed',
        description: err.message || 'Failed to upload video',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  if (uploadComplete) {
    return (
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="font-semibold text-green-900 dark:text-green-100">Upload Complete!</p>
          <p className="text-sm text-green-700 dark:text-green-300">Video and thumbnail saved successfully</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <Label htmlFor="video-upload" className="text-base font-semibold mb-2 block">
            Upload Video
          </Label>
          <input
            ref={videoInputRef}
            id="video-upload"
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={handleVideoSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => videoInputRef.current?.click()}
            className="w-full"
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {videoFile ? videoFile.name : 'Choose Video (Max 50MB)'}
          </Button>
          {videoFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVideoFile(null)}
              className="mt-2"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          )}
        </div>

        <div>
          <Label htmlFor="thumbnail-upload" className="text-base font-semibold mb-2 block">
            Upload Thumbnail (Optional)
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            Thumbnail will be auto-generated from video if not provided
          </p>
          <input
            ref={thumbnailInputRef}
            id="thumbnail-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleThumbnailSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => thumbnailInputRef.current?.click()}
            className="w-full"
            disabled={uploading}
          >
            <Image className="w-4 h-4 mr-2" />
            {thumbnailFile ? thumbnailFile.name : 'Choose Thumbnail (Max 5MB)'}
          </Button>
          {thumbnailFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setThumbnailFile(null)}
              className="mt-2"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          )}
        </div>

        <Button
          onClick={handleUpload}
          disabled={!videoFile || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Video {thumbnailFile && '+ Thumbnail'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
