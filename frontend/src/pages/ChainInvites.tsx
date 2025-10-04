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
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Welcome! Let's show you around 👋</h3>
          <p className="text-sm">This quick tour takes just 30 seconds.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true
    },
    {
      target: '.guest-inviter',
      content: (
        <div className="space-y-1">
          <h4 className="font-semibold">See who invited you</h4>
          <p className="text-sm">Someone in their network thinks you can help make this connection!</p>
        </div>
      ),
      placement: 'bottom'
    },
    {
      target: '.guest-target',
      content: (
        <div className="space-y-1">
          <h4 className="font-semibold">🎯 The person to reach</h4>
          <p className="text-sm">Help connect to this target and you'll earn rewards.</p>
        </div>
      ),
      placement: 'bottom'
    },
    {
      target: '.guest-reward',
      content: (
        <div className="space-y-1">
          <h4 className="font-semibold">💰 Your potential earnings</h4>
          <p className="text-sm">Earn credits for helping. The more you share, the more you can earn!</p>
        </div>
      ),
      placement: 'top'
    },
    {
      target: '.guest-join-button',
      content: (
        <div className="space-y-1">
          <h4 className="font-semibold">Ready to join? ✨</h4>
          <p className="text-sm">Sign up to join the chain and get your shareable link.</p>
        </div>
      ),
      placement: 'top',
      spotlightClicks: true
    },
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
          styles={{
            options: {
              primaryColor: '#37d5a3',
              backgroundColor: '#0f1419',
              textColor: '#fafafa',
              overlayColor: 'rgba(0, 0, 0, 0.75)',
              arrowColor: '#0f1419',
              zIndex: 10000,
            },
            tooltip: {
              backgroundColor: '#0f1419',
              borderRadius: '12px',
              color: '#fafafa',
              fontSize: '14px',
            },
            tooltipTitle: {
              color: '#fafafa',
              fontSize: '16px',
            },
            buttonNext: {
              backgroundColor: '#37d5a3',
              color: '#0f1419',
              borderRadius: '8px',
              fontSize: '14px',
              padding: '8px 16px',
            },
            buttonBack: {
              color: '#9ca3af',
              marginRight: '8px',
            },
            buttonSkip: {
              color: '#9ca3af',
            },
          }}
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

        {/* Guest explainer modal (welcoming 3-slide intro) */}
        {!user && (
          <div className={`${showExplainer ? '' : 'hidden'}`}>
            <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-8 border border-border">
                {explainerSlide === 0 && (
                  <div className="space-y-4 text-center">
                    <div className="text-6xl mb-2">👋</div>
                    <h3 className="text-2xl font-bold">Welcome! You've been invited</h3>
                    <p className="text-base text-muted-foreground">Someone values your network and thinks you can help make an important connection.</p>
                  </div>
                )}
                {explainerSlide === 1 && (
                  <div className="space-y-4">
                    <div className="text-6xl mb-2 text-center">🔗</div>
                    <h3 className="text-2xl font-bold text-center">How it works</h3>
                    <div className="space-y-3 text-left">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-sm font-bold text-primary">1</span>
                        </div>
                        <div>
                          <p className="font-medium">Join the chain</p>
                          <p className="text-sm text-muted-foreground">Sign up and become part of the network</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-sm font-bold text-primary">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Share your link</p>
                          <p className="text-sm text-muted-foreground">Forward to people who might know the target</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-sm font-bold text-primary">3</span>
                        </div>
                        <div>
                          <p className="font-medium">Earn rewards</p>
                          <p className="text-sm text-muted-foreground">Get credits for every successful connection</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {explainerSlide === 2 && (
                  <div className="space-y-4">
                    <div className="text-6xl mb-2 text-center">💰</div>
                    <h3 className="text-2xl font-bold text-center">Everyone wins</h3>
                    <p className="text-base text-muted-foreground text-center">The reward pool is shared among everyone who helps. The earlier you join and the more you share, the more you can earn!</p>
                    <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                      <p className="text-sm font-medium text-center">Use your earned credits to create your own connection requests later</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
                  <Button variant="ghost" onClick={() => setShowExplainer(false)} className="text-sm">Skip</Button>
                  <div className="flex items-center gap-2">
                    {explainerSlide > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setExplainerSlide((s) => Math.max(0, s - 1))}>Back</Button>
                    )}
                    {explainerSlide < 2 ? (
                      <Button size="sm" onClick={() => setExplainerSlide((s) => Math.min(2, s + 1))}>Next</Button>
                    ) : (
                      <Button size="sm" onClick={startGuestTour} className="bg-primary text-primary-foreground">Show me around</Button>
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