import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Link as LinkIcon } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { VideoModal } from '@/components/VideoModal';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

const VideoShare: React.FC = () => {
  const q = useQuery();
  const navigate = useNavigate();
  const requestId = q.get('requestId') || '';
  const refLinkId = q.get('ref') || ''; // Referral link from participant who shared
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<string>('');
  const [shareableLink, setShareableLink] = useState<string>('');
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Prefer linkId from ref to resolve request by share link, else fall back to requestId lookup
        const endpoint = refLinkId
          ? `/api/requests/share/${encodeURIComponent(refLinkId)}`
          : `/api/requests/by-id/${encodeURIComponent(requestId)}`;
        const data = await apiGet(endpoint);
        if (!mounted) return;
        const req = data?.request || data; // support either shape
        setVideoUrl(req?.video_url || null);
        setTarget(req?.target || 'Unknown Target');

        // If we have a ref parameter, use it to construct the shareable link
        // Otherwise fall back to the request's shareable link
        if (refLinkId) {
          const refShareableLink = `${window.location.origin}/r/${refLinkId}`;
          setShareableLink(refShareableLink);
          setLinkId(refLinkId);
        } else {
          setShareableLink(req?.shareable_link || '');
          // Extract linkId from shareable_link suffix /r/:linkId
          const share = req?.shareable_link as string | undefined;
          if (share) {
            const m = share.match(/\/r\/(.+)$/);
            if (m) setLinkId(m[1]);
          }
        }

        // Auto-open video modal if video exists
        if (req?.video_url) {
          setShowVideoModal(true);
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
    <>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading video...</h1>
          <p className="text-muted-foreground">
            {videoUrl ? 'Opening video player...' : 'Preparing your experience...'}
          </p>
        </div>
      </div>

      {/* New branded video modal for public users */}
      {videoUrl && (
        <VideoModal
          isOpen={showVideoModal}
          onClose={() => {
            setShowVideoModal(false);
            // When modal closes, redirect to chain invite
            if (linkId) {
              navigate(`/r/${linkId}`);
            }
          }}
          videoUrl={videoUrl}
          requestId={requestId}
          target={target}
          shareableLink={shareableLink}
          isAuthenticatedView={false} // This is for public/unauthenticated users
          onShare={() => {
            if (shareableLink && navigator.share) {
              navigator.share({
                title: `Connect to ${target}`,
                text: `Help connect with ${target}`,
                url: shareableLink
              });
            } else if (shareableLink) {
              navigator.clipboard.writeText(shareableLink);
            }
          }}
        />
      )}
    </>
  );
};

export default VideoShare;


