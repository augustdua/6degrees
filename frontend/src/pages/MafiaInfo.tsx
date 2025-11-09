import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMafias, type MafiaDetails } from '@/hooks/useMafias';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatOfferPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { JoinMafiaModal } from '@/components/JoinMafiaModal';
import { EditMafiaModal } from '@/components/EditMafiaModal';
import {
  Crown,
  Users,
  DollarSign,
  MessageSquare,
  ArrowLeft,
  Share2,
  Edit,
  Link as LinkIcon,
  Building2,
  Loader2,
  TrendingUp,
} from 'lucide-react';

const MafiaInfo: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { userCurrency } = useCurrency();
  const { getMafiaDetails, generateFoundingLink, getMafiaRevenue } = useMafias();

  const [mafia, setMafia] = useState<MafiaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [revenue, setRevenue] = useState<any>(null);

  const userMembership = mafia?.members?.find((m) => m.user_id === user?.id);
  const isAdmin = userMembership?.role === 'admin';
  const isMember = !!userMembership;
  const isFoundingOrAdmin = userMembership?.role === 'admin' || userMembership?.role === 'founding';

  useEffect(() => {
    if (id) {
      loadMafiaDetails();
    }
  }, [id]);

  useEffect(() => {
    if (mafia && isFoundingOrAdmin) {
      loadRevenue();
    }
  }, [mafia, isFoundingOrAdmin]);

  const loadMafiaDetails = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getMafiaDetails(id);
      setMafia(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load mafia details',
        variant: 'destructive',
      });
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const loadRevenue = async () => {
    if (!id) return;
    try {
      const data = await getMafiaRevenue(id);
      setRevenue(data);
    } catch (error) {
      // Silently fail if not authorized
      console.error('Failed to load revenue:', error);
    }
  };

  const handleGenerateFoundingLink = async () => {
    if (!id) return;

    setLinkLoading(true);
    try {
      const { invite_link } = await generateFoundingLink(id);

      // Copy to clipboard
      await navigator.clipboard.writeText(invite_link);

      toast({
        title: 'Invite Link Generated! 📋',
        description: 'Link copied to clipboard. Share it with potential founding members.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate invite link',
        variant: 'destructive',
      });
    } finally {
      setLinkLoading(false);
    }
  };

  const handleOpenChat = () => {
    if (mafia?.conversation_id) {
      navigate(`/messages?conversation=${mafia.conversation_id}`);
    } else {
      toast({
        title: 'Chat Not Available',
        description: 'Group chat will be available soon',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!mafia) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Cover Image */}
              {mafia.organization?.logo_url ? (
                <img
                  src={mafia.organization.logo_url}
                  alt={mafia.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                  <Crown className="w-10 h-10 text-primary" />
                </div>
              )}

              {/* Info */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{mafia.name}</h1>
                  {userMembership && (
                    <Badge variant="secondary">
                      {userMembership.role === 'admin' && '👑 Admin'}
                      {userMembership.role === 'founding' && '⭐ Founding Member'}
                      {userMembership.role === 'paid' && '💎 Member'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {mafia.members.length} member{mafia.members.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {formatOfferPrice({ asking_price_inr: mafia.monthly_price_inr, asking_price_usd: mafia.monthly_price_usd, currency: mafia.currency } as any, userCurrency)}/mo
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {!isMember && (
                <Button onClick={() => setShowJoinModal(true)}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Join Mafia
                </Button>
              )}
              {isMember && (
                <Button onClick={handleOpenChat}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Group Chat
                </Button>
              )}
              {isAdmin && (
                <>
                  <Button variant="outline" onClick={handleGenerateFoundingLink} disabled={linkLoading}>
                    {linkLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LinkIcon className="w-4 h-4 mr-2" />
                    )}
                    Invite Founding
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{mafia.description}</p>
              </CardContent>
            </Card>

            {/* Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Members ({mafia.members.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mafia.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.user?.profile_picture_url} />
                        <AvatarFallback>
                          {member.user?.first_name?.[0]}
                          {member.user?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {member.user?.first_name} {member.user?.last_name}
                          </p>
                          {member.role === 'admin' && <Crown className="w-4 h-4 text-primary" />}
                          {member.role === 'founding' && <Badge variant="secondary">Founding</Badge>}
                        </div>
                        {member.user?.bio && (
                          <p className="text-sm text-muted-foreground truncate">{member.user.bio}</p>
                        )}
                        {/* Organizations */}
                        {member.user?.user_organizations && member.user.user_organizations.length > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            {member.user.user_organizations.map((uo: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                                {uo.organization.logo_url && (
                                  <img
                                    src={uo.organization.logo_url}
                                    alt={uo.organization.name}
                                    className="w-4 h-4 object-contain"
                                  />
                                )}
                                <span>{uo.organization.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Revenue Stats (admin & founding only) */}
            {isFoundingOrAdmin && revenue && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-500">
                      ${revenue.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-xl font-semibold">${revenue.thisMonth.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Subscribers</p>
                    <p className="text-xl font-semibold">{revenue.activeSubscribers}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Price</span>
                  <span className="font-semibold">{formatOfferPrice({ asking_price_inr: mafia.monthly_price_inr, asking_price_usd: mafia.monthly_price_usd, currency: mafia.currency } as any, userCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Members</span>
                  <span className="font-semibold">{mafia.members.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Founding Members</span>
                  <span className="font-semibold">
                    {mafia.members.filter((m) => m.role === 'admin' || m.role === 'founding').length}/
                    {mafia.founding_members_limit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="font-semibold">
                    {new Date(mafia.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Creator */}
            {mafia.creator && (
              <Card>
                <CardHeader>
                  <CardTitle>Created By</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={mafia.creator.profile_picture_url} />
                      <AvatarFallback>
                        {mafia.creator.first_name?.[0]}
                        {mafia.creator.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {mafia.creator.first_name} {mafia.creator.last_name}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        <Crown className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Join Modal */}
      <JoinMafiaModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        mafia={mafia}
        onSuccess={loadMafiaDetails}
      />

      {/* Edit Modal */}
      {isAdmin && (
        <EditMafiaModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          mafia={mafia}
          onSuccess={loadMafiaDetails}
        />
      )}
    </div>
  );
};

export default MafiaInfo;

