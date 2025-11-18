import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { convertAndFormatCurrency, type Currency } from '@/lib/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ProfileCollage from '@/components/ProfileCollage';
import {
  ArrowLeft,
  Linkedin,
  ExternalLink,
  Lock,
  Briefcase,
  MessageSquare,
  Building2,
  TrendingUp
} from 'lucide-react';

interface PublicProfileData {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    bio: string | null;
    linkedin_url: string | null;
    profile_picture_url: string | null;
    is_profile_public: boolean;
  };
  organizations: Array<{
    id: string;
    name: string;
    logo_url: string | null;
    position: string | null;
    is_current: boolean;
    organization_type: string;
  }>;
  featured_connections: Array<{
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
    bio: string | null;
    display_order: number;
  }>;
  active_offers_count: number;
  active_requests_count: number;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  asking_price_inr: number;
  asking_price_eur?: number;
  currency: Currency;
  created_at: string;
}

interface Request {
  id: string;
  target: string;
  message: string | null;
  reward: number;
  currency: Currency;
  created_at: string;
}

const PublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { userCurrency } = useCurrency();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfile();
      setIsOwnProfile(currentUser?.id === userId);
    }
  }, [userId, currentUser]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch profile data using the database function
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_public_profile', { p_user_id: userId });

      if (profileError) throw profileError;

      if (!profileData) {
        setError('Profile not found');
        return;
      }

      setProfile(profileData as PublicProfileData);

      // Check if profile is private
      if (!profileData.user.is_profile_public && currentUser?.id !== userId) {
        setError('This profile is private');
        return;
      }

      // Fetch active offers
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('id, title, description, asking_price_inr, asking_price_eur, currency, created_at')
        .eq('offer_creator_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);

      if (offersError) {
        console.error('Error fetching offers:', offersError);
      } else {
        setOffers(offersData || []);
      }

      // Fetch active requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('connection_requests')
        .select('id, target, message, reward, currency, created_at')
        .eq('creator_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
      } else {
        setRequests(requestsData || []);
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-card/50 backdrop-blur">
          <div className="container mx-auto px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-16 text-center">
          <Alert className="max-w-md mx-auto">
            <Lock className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/feed')} className="mt-4">
            Go to Feed
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const userName = `${profile.user.first_name} ${profile.user.last_name}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {isOwnProfile && (
              <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Collage */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* User Info at Top */}
            <div className="text-center space-y-4 mb-6">
              <h1 className="text-4xl font-bold">{userName}</h1>
              {profile.user.bio && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {profile.user.bio}
                </p>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="flex justify-center mb-8">
              <Avatar className="w-44 h-44 border-[10px] border-white ring-4 ring-primary/30 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_4px_rgba(55,213,163,0.4)]">
                <AvatarImage src={profile.user.profile_picture_url || undefined} alt={userName} />
                <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/70">
                  {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Organization Metro Tiles */}
            {profile.organizations.length > 0 ? (
              <div className="relative bg-gradient-to-br from-primary/8 via-primary/3 to-transparent rounded-[30px] p-2.5 backdrop-blur-md mb-8 border-2 border-primary/15 shadow-lg mx-auto" style={{ maxWidth: '470px' }}>
                <ProfileCollage
                  organizations={profile.organizations}
                />
              </div>
            ) : (
              <div className="max-w-md mx-auto mb-8">
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="pt-6 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    {isOwnProfile ? (
                      <>
                        <h3 className="font-semibold mb-2">Build Your Professional Network</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add organizations you're affiliated with to showcase your professional connections
                        </p>
                        <Button onClick={() => navigate('/profile')} variant="outline" size="sm">
                          Add Organizations
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold mb-2">No Organizations Yet</h3>
                        <p className="text-sm text-muted-foreground">
                          {profile.user.first_name} hasn't added any organizations to their profile yet
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4 flex-wrap mb-8">
              {!isOwnProfile && currentUser && (
                <Button size="lg" className="px-8">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Connect
                </Button>
              )}
              {profile.user.linkedin_url && (
                <Button variant="outline" size="lg" asChild>
                  <a
                    href={profile.user.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Organizations */}
          {profile.organizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organizations
                </CardTitle>
                <CardDescription>
                  Professional affiliations and educational background
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.organizations.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{org.name}</div>
                        {org.position && (
                          <div className="text-sm text-muted-foreground truncate">
                            {org.position}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {org.is_current && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {org.organization_type || 'Work'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Offers */}
          {offers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Active Offers ({profile.active_offers_count})
                </CardTitle>
                <CardDescription>
                  Services and connections offered by {profile.user.first_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offers.map((offer) => (
                    <Link
                      key={offer.id}
                      to={`/feed?tab=bids&highlight=${offer.id}`}
                      className="block"
                    >
                      <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                        <CardHeader>
                          <CardTitle className="text-lg line-clamp-2">
                            {offer.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                            {offer.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="font-semibold">
                              {convertAndFormatCurrency(
                                offer.asking_price_inr,
                                'INR',
                                userCurrency
                              )}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(offer.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Requests */}
          {requests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Active Requests ({profile.active_requests_count})
                </CardTitle>
                <CardDescription>
                  Connections {profile.user.first_name} is looking for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requests.map((request) => (
                    <Link
                      key={request.id}
                      to={`/request/${request.id}`}
                      className="block"
                    >
                      <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                        <CardHeader>
                          <CardTitle className="text-lg line-clamp-2">
                            {request.target}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {request.message && (
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                              {request.message}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="font-semibold">
                              {convertAndFormatCurrency(
                                request.reward,
                                request.currency,
                                userCurrency
                              )}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {offers.length === 0 && requests.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No active offers or requests at the moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;


