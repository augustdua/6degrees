import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import GuestRequestView from '@/components/GuestRequestView';

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

  return (
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
  );
};

export default ChainInvites;