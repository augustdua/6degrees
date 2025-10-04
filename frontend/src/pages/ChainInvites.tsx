import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useEffect, useState } from 'react';
import Joyride from 'react-joyride';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import GuestRequestView from '@/components/GuestRequestView';
import { convertAndFormatINR } from '@/lib/currency';

const ChainInvites = () => {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, isReady } = useAuth();
  const { request, chain, loading, error, getRequestByLink } = useRequests();
  const [showExplainer, setShowExplainer] = useState(false);
  const [explainerSlide, setExplainerSlide] = useState(0);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (linkId) {
      getRequestByLink(linkId);
    }
  }, [linkId, getRequestByLink]);

  // Decide whether to show guest explainer for unauthenticated users
  useEffect(() => {
    if (!authLoading && isReady && !user && linkId) {
      const key = `guest_onboard_seen_${linkId}`;
      const seen = sessionStorage.getItem(key);
      if (!seen) setShowExplainer(true);
    }
  }, [authLoading, isReady, user, linkId]);

  const startGuestTour = () => {
    if (!linkId) return;
    sessionStorage.setItem(`guest_onboard_seen_${linkId}`, 'true');
    setShowExplainer(false);
    setRunTour(true);
  };

  const steps = [
    { target: 'body', content: <div><h3 className="text-base font-semibold">Quick tour 👋</h3><p className="text-sm">30 seconds.</p></div>, placement: 'center', disableBeacon: true },
    { target: '.guest-inviter', content: <div><h4 className="font-semibold mb-1">Who invited you</h4><p className="text-sm">See creator info</p></div>, placement: 'bottom' },
    { target: '.guest-target', content: <div><h4 className="font-semibold mb-1">🎯 The target</h4><p className="text-sm">Who you're helping reach</p></div>, placement: 'right' },
    { target: '.guest-reward', content: <div><h4 className="font-semibold mb-1">💰 Reward</h4><p className="text-sm">What’s at stake</p></div>, placement: 'left' },
    { target: '.guest-join-button', content: <div><h4 className="font-semibold mb-1">Join</h4><p className="text-sm">Sign up to participate</p></div>, placement: 'top', spotlightClicks: true },
  ];

  // Track link click for analytics and credit rewards
  useEffect(() => {
    const trackClick = async () => {
      if (!linkId) return;

      // Only track once per session
      const clickTracked = sessionStorage.getItem(`click_tracked_${linkId}`);
      if (clickTracked) return;

      try {
        // Get geolocation data (optional)
        let geoData = {};
        try {
          const geoResponse = await fetch('https://ipapi.co/json/');
          if (geoResponse.ok) {
            const geo = await geoResponse.json();
            geoData = {
              country: geo.country_code,
              city: geo.city
            };
          }
        } catch (geoError) {
          console.log('Could not get geolocation:', geoError);
        }

        // Track the click
        const res = await fetch(`/api/clicks/track/${linkId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(geoData)
        });

        if (res.ok) {
          // Mark as tracked in session only on success
          sessionStorage.setItem(`click_tracked_${linkId}`, 'true');
        }
      } catch (error) {
        console.error('Error tracking click:', error);
        // Don't show error to user, tracking failure shouldn't break UX
      }
    };

    trackClick();
  }, [linkId]);

  // Show loading while auth is still initializing
  if (authLoading || !isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chain invite...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4">Invite Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'This chain invite could not be found.'}</p>
          <div className="space-y-3">
            {user ? (
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            ) : (
              <Button onClick={() => navigate('/')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Generate dynamic meta tags based on request data
  const creator = request?.creator;
  const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Someone';

  const title = request ? `${creatorName} wants to connect with ${request.target}` : 'Chain Invite - 6Degree';
  const description = request
    ? `${request.message ? `"${request.message}" - ` : ''}Help ${creatorName} reach ${request.target} and earn ${convertAndFormatINR(request.reward)} reward!`
    : 'Join this connection chain on 6Degree and earn rewards for helping make connections.';

  const shortDescription = description.length > 160 ? description.substring(0, 157) + '...' : description;

  // Use the enhanced static image with cache busting
  const ogImageUrl = `${window.location.origin}/og-chain-invite-dynamic.svg?v=${Date.now()}`;

  return (
    <>
      {/* Guest Joyride */}
      {!user && (
        <Joyride
          steps={steps as any}
          run={runTour}
          continuous
          showProgress
          showSkipButton
          scrollToFirstStep
          styles={{ options: { primaryColor: '#3b82f6', zIndex: 10000 } }}
        />
      )}
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={shortDescription} />

        {/* Override all Open Graph tags to ensure they take precedence */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={shortDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/svg+xml" />
        <meta property="og:site_name" content="6Degree" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter Card - override all defaults */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={shortDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        <meta name="twitter:image:alt" content={`Join ${creatorName}'s connection chain to reach ${request?.target || 'their target'}`} />
        <meta name="twitter:site" content="@6degrees" />
        <meta name="twitter:creator" content="@6degrees" />

        {/* WhatsApp/Telegram specific */}
        <meta property="og:image:alt" content={`Join ${creatorName}'s connection chain to reach ${request?.target || 'their target'}`} />
        
        {/* Additional meta tags to ensure proper sharing */}
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#3b82f6" />
        
        {/* Prevent caching of this page's metadata */}
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta http-equiv="Pragma" content="no-cache" />
        <meta http-equiv="Expires" content="0" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          {user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Chain Invite</h1>
            <p className="text-muted-foreground">Join this connection chain</p>
          </div>
        </div>

        {/* Guest explainer modal (lightweight, 2 slides) */}
        {!user && (
          <div className={`${showExplainer ? '' : 'hidden'}`}>
            <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-card rounded-xl shadow-lg max-w-md w-full p-6">
                {explainerSlide === 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Use your network for warm intros</h3>
                    <p className="text-sm text-muted-foreground">Help reach the target and earn credits.</p>
                  </div>
                )}
                {explainerSlide === 1 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Credits vs cash</h3>
                    <p className="text-sm text-muted-foreground">You earn credits. The target may receive a consultation fee.</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4">
                  <Button variant="ghost" onClick={() => setShowExplainer(false)} className="text-xs">Skip</Button>
                  <div className="flex items-center gap-2">
                    {explainerSlide > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setExplainerSlide((s) => Math.max(0, s - 1))}>Back</Button>
                    )}
                    {explainerSlide < 1 ? (
                      <Button size="sm" onClick={() => setExplainerSlide((s) => Math.min(1, s + 1))}>Next</Button>
                    ) : (
                      <Button size="sm" onClick={startGuestTour}>Show me around</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <GuestRequestView
          request={request}
          chain={chain}
          linkId={linkId || ''}
        />
        </div>
      </div>
    </>
  );
};

export default ChainInvites;