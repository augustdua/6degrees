import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Link as LinkIcon } from 'lucide-react';
import { apiGet } from '@/lib/api';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

const VideoShare: React.FC = () => {
  const q = useQuery();
  const navigate = useNavigate();
  const requestId = q.get('requestId') || '';
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // fetch request by requestId
        const data = await apiGet(`/api/requests/share/${encodeURIComponent(requestId)}`);
        if (!mounted) return;
        const req = data?.request || data; // support either shape
        setVideoUrl(req?.video_url || null);
        // Extract linkId from shareable_link suffix /r/:linkId
        const share = req?.shareable_link as string | undefined;
        if (share) {
          const m = share.match(/\/r\/(.+)$/);
          if (m) setLinkId(m[1]);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load video');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [requestId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <p className="mb-4">{error || 'Video not available for this request.'}</p>
          {linkId && (
            <Button onClick={() => navigate(`/r/${linkId}`)}>Go to Chain Invite</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden">
          <video src={videoUrl} controls className="w-full h-full object-cover" playsInline />
        </div>
        <div className="flex justify-center mt-4">
          {linkId ? (
            <Button size="lg" className="gap-2" onClick={() => navigate(`/r/${linkId}`)}>
              <ArrowRight className="w-5 h-5" /> Join Chain
            </Button>
          ) : (
            <Button size="lg" variant="outline" disabled>
              <LinkIcon className="w-5 h-5 mr-2" /> Invite link unavailable
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoShare;


