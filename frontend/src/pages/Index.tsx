import ChainHero from "@/components/ChainHero";
import CreateRequestForm from "@/components/CreateRequestForm";
import GuestRequestView from "@/components/GuestRequestView";
import { useAuth } from "@/hooks/useAuth";
import { useRequests } from "@/hooks/useRequests";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { User, LogIn } from "lucide-react";
import { useState, useEffect } from "react";

const Index = () => {
  const { user } = useAuth();
  const { getRequestByLink } = useRequests();
  const { linkId } = useParams();
  const [requestData, setRequestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (linkId) {
      setLoading(true);
      getRequestByLink(linkId)
        .then((data) => {
          setRequestData(data);
        })
        .catch((error) => {
          console.error('Error fetching request:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [linkId, getRequestByLink]);

  // If we're viewing a specific request link
  if (linkId) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading request...</p>
          </div>
        </div>
      );
    }

    if (!requestData) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Request Not Found</h1>
            <p className="text-muted-foreground mb-6">This connection request could not be found or has expired.</p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <main className="min-h-screen py-20 px-4">
        {/* Header with auth buttons */}
        <header className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Button variant="ghost" asChild>
              <Link to="/">← Back to Home</Link>
            </Button>
            <div className="flex gap-4">
              {user ? (
                <Button variant="outline" asChild>
                  <Link to="/profile">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link to="/auth">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        <GuestRequestView 
          request={requestData.request} 
          chain={requestData.chain} 
          linkId={linkId} 
        />
      </main>
    );
  }

  // Default homepage
  return (
    <main className="min-h-screen">
      {/* Header with auth buttons */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="container mx-auto flex justify-end gap-4">
          {user ? (
            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/auth">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </header>

      <ChainHero />
      
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Ready to Start Networking?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create your first connection request and watch your network work for you.
            </p>
          </div>
          
          <CreateRequestForm />
        </div>
      </section>
    </main>
  );
};

export default Index;
