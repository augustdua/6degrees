import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (linkId) {
      getRequestByLink(linkId);
    }
  }, [linkId, getRequestByLink]);

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